import mongoose, { Types } from "mongoose";
import type { QueryFilter, UpdateQuery } from "mongoose";
import type { Message } from "firebase-admin/messaging";
import FirebaseService from "./firebase.service";
import UserDb from "../db/mongo/users.mongo";
import NotificationCampaignDb from "../db/mongo/notificationCampaign.mongo";
import { iUsers } from "../interfaces/user.interface";
import {
    iAudienceCount,
    iNotificationAudience,
    iNotificationCampaign,
    iNotificationContent,
} from "../interfaces/notification.interface";
import {
    eNotificationAudienceType,
    eNotificationCampaignStatus,
    eNotificationPremiumFilter,
    eNotificationRegistrationFilter,
    eNotificationStatusFilter,
} from "../enums/notification.enum";

const FCM_MAX_BATCH_SIZE = 500;
// Admin campaigns are not time critical, so an offline phone may still receive one for a day
const CAMPAIGN_TTL_SECONDS = 24 * 60 * 60;
const MAX_STORED_FAILED_USERS = 10000;
// A running campaign updates its document after every batch; silence for this long means the run died
const STUCK_CAMPAIGN_MS = 30 * 60 * 1000;
const NOTIFICATION_DATA_TYPE = "admin_broadcast";

// Error codes meaning the token will never work again (app uninstalled, token rotated, malformed)
const INVALID_TOKEN_ERROR_CODES = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
]);

interface iRecipient {
    userId: Types.ObjectId;
    token: string;
}

interface iChunkOutcome {
    sent: number;
    failed: number;
    failedUserIds: Types.ObjectId[];
    reasons: Record<string, number>;
    invalidRecipients: iRecipient[];
}

interface iBuildMessageArgs {
    token: string;
    content: iNotificationContent;
    campaignId: string;
}

export interface iTestSendResult {
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
}

export default class NotificationService {
    public static instance: NotificationService = new NotificationService();
    private isProcessingScheduled = false;
    private constructor() { }

    public isReady(): boolean {
        return FirebaseService.instance.isReady();
    }

    /** Users a campaign with this audience would be addressed to (deleted users are always excluded). */
    public buildUserFilter(audience: iNotificationAudience): QueryFilter<iUsers> {
        const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

        if (audience.type === eNotificationAudienceType.USERS) {
            filter._id = { $in: (audience.userIds ?? []).map((id) => new Types.ObjectId(id)) };
            return filter;
        }

        // A user with no isActive value is treated as active. "All" never reaches deactivated users.
        filter.isActive = audience.status === eNotificationStatusFilter.INACTIVE ? false : { $ne: false };

        if (audience.premium) {
            filter.isPremium = audience.premium === eNotificationPremiumFilter.PREMIUM ? true : { $ne: true };
        }
        if (audience.registration) {
            filter.isRegistrationCompleted = audience.registration === eNotificationRegistrationFilter.COMPLETED
                ? true
                : { $ne: true };
        }
        if (audience.platform) {
            filter.platform = new RegExp(`^${audience.platform}$`, "i");
        }
        if (audience.appVersions && audience.appVersions.length > 0) {
            filter.appVersion = { $in: audience.appVersions };
        }
        return filter;
    }

    private withToken(filter: QueryFilter<iUsers>): QueryFilter<iUsers> {
        return { ...filter, fcmToken: { $nin: [null, ""] } };
    }

    public async countAudience(audience: iNotificationAudience): Promise<iAudienceCount> {
        const filter = this.buildUserFilter(audience);
        const [matched, reachable] = await Promise.all([
            UserDb.countDocuments(filter),
            UserDb.countDocuments(this.withToken(filter)),
        ]);
        return { matched, reachable, withoutToken: matched - reachable };
    }

    public async sendTest({ token, content }: { token: string; content: iNotificationContent }): Promise<iTestSendResult> {
        try {
            const message = this.buildMessage({ token, content, campaignId: "test" });
            const response = await FirebaseService.instance.sendEach([message]);
            const [result] = response.responses;
            if (result.success) {
                return { success: true };
            }
            return { success: false, errorCode: result.error?.code, errorMessage: result.error?.message };
        } catch (err: unknown) {
            console.error("[NotificationService] Test send failed:", err);
            return { success: false, errorCode: "batch-failed", errorMessage: err instanceof Error ? err.message : String(err) };
        }
    }

    /**
     * Runs a campaign that is already marked "sending". Never rejects: any failure is recorded on the
     * campaign. With retryUserIds only those recipients are addressed (used to retry failed deliveries).
     */
    public async runCampaign({ campaignId, retryUserIds }: { campaignId: Types.ObjectId; retryUserIds?: Types.ObjectId[] }): Promise<void> {
        try {
            const campaign = await NotificationCampaignDb.findById(campaignId).lean();
            if (!campaign) {
                return;
            }

            const filter: QueryFilter<iUsers> = retryUserIds
                ? ({ isDeleted: { $ne: true }, _id: { $in: retryUserIds } })
                : this.buildUserFilter(campaign.audience);

            if (!retryUserIds) {
                const [matched, reachable] = await Promise.all([
                    UserDb.countDocuments(filter),
                    UserDb.countDocuments(this.withToken(filter)),
                ]);
                await NotificationCampaignDb.updateOne(
                    { _id: campaignId },
                    { $set: { "stats.targeted": reachable, "stats.withoutToken": matched - reachable } }
                );
            }

            await this.deliver({ campaign, filter: this.withToken(filter) });
            await this.finishCampaign(campaignId);
        } catch (err: unknown) {
            console.error(`[NotificationService] Campaign ${String(campaignId)} failed:`, err);
            await this.markFailed({ campaignId, message: err instanceof Error ? err.message : String(err) });
        }
    }

    /** Called every minute by the cron: starts due scheduled campaigns and fails the ones that stalled. */
    public async processScheduledCampaigns(): Promise<void> {
        // The cron can fire before the database is connected; skip the tick instead of queueing queries that time out
        if (this.isProcessingScheduled || mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
            return;
        }
        this.isProcessingScheduled = true;
        try {
            await this.failStuckCampaigns();

            let due = await this.claimDueCampaign();
            while (due) {
                if (this.isReady()) {
                    await this.runCampaign({ campaignId: due });
                } else {
                    await this.markFailed({ campaignId: due, message: "Firebase is not configured on this server" });
                }
                due = await this.claimDueCampaign();
            }
        } catch (err: unknown) {
            console.error("[NotificationService] Processing scheduled campaigns failed:", err);
        } finally {
            this.isProcessingScheduled = false;
        }
    }

    private async claimDueCampaign(): Promise<Types.ObjectId | null> {
        const now = new Date();
        const claimed = await NotificationCampaignDb.findOneAndUpdate(
            { status: eNotificationCampaignStatus.SCHEDULED, scheduledAt: { $lte: now } },
            { $set: { status: eNotificationCampaignStatus.SENDING, startedAt: now } },
            { sort: { scheduledAt: 1 }, returnDocument: "after" }
        ).select("_id").lean();
        return claimed?._id ?? null;
    }

    private async failStuckCampaigns(): Promise<void> {
        await NotificationCampaignDb.updateMany(
            { status: eNotificationCampaignStatus.SENDING, updatedAt: { $lt: new Date(Date.now() - STUCK_CAMPAIGN_MS) } },
            {
                $set: {
                    status: eNotificationCampaignStatus.FAILED,
                    completedAt: new Date(),
                    errorMessage: "Sending was interrupted (server restarted or timed out). Retry to resend to the recipients that failed.",
                },
            }
        );
    }

    private async deliver({ campaign, filter }: { campaign: iNotificationCampaign; filter: QueryFilter<iUsers> }): Promise<void> {
        const cursor = UserDb.find(filter).select("_id fcmToken").lean().cursor();
        let chunk: iRecipient[] = [];

        for await (const user of cursor) {
            if (!user.fcmToken || !user._id) {
                continue;
            }
            chunk.push({ userId: user._id as unknown as Types.ObjectId, token: user.fcmToken });
            if (chunk.length >= FCM_MAX_BATCH_SIZE) {
                await this.processChunk({ campaign, recipients: chunk });
                chunk = [];
            }
        }

        if (chunk.length > 0) {
            await this.processChunk({ campaign, recipients: chunk });
        }
    }

    private async processChunk({ campaign, recipients }: { campaign: iNotificationCampaign; recipients: iRecipient[] }): Promise<void> {
        const outcome = await this.sendChunk({ campaign, recipients });
        await this.removeInvalidTokens(outcome.invalidRecipients);

        const increments: Record<string, number> = {
            "stats.sent": outcome.sent,
            "stats.failed": outcome.failed,
            "stats.retryable": outcome.failedUserIds.length,
        };
        for (const [code, count] of Object.entries(outcome.reasons)) {
            increments[`failureReasons.${code.replace(/[.$]/g, "_")}`] = count;
        }

        const update = {
            $inc: increments,
            $push: { failedUserIds: { $each: outcome.failedUserIds, $slice: MAX_STORED_FAILED_USERS } },
        } as UpdateQuery<iNotificationCampaign>;
        await NotificationCampaignDb.updateOne({ _id: campaign._id }, update);
    }

    private async sendChunk({ campaign, recipients }: { campaign: iNotificationCampaign; recipients: iRecipient[] }): Promise<iChunkOutcome> {
        const outcome: iChunkOutcome = { sent: 0, failed: 0, failedUserIds: [], reasons: {}, invalidRecipients: [] };
        const campaignId = String(campaign._id);

        try {
            const response = await FirebaseService.instance.sendEach(
                recipients.map((r) => this.buildMessage({ token: r.token, content: campaign, campaignId }))
            );

            response.responses.forEach((result, index) => {
                const recipient = recipients[index];
                if (result.success) {
                    outcome.sent += 1;
                    return;
                }
                const errorCode = result.error?.code ?? "unknown";
                this.recordFailure({ outcome, recipient, errorCode });
                if (INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
                    outcome.invalidRecipients.push(recipient);
                }
            });
        } catch (err: unknown) {
            // The whole batch failed (credentials, network); report every recipient in it as failed
            console.error("[NotificationService] sendEach failed for batch:", err);
            for (const recipient of recipients) {
                this.recordFailure({ outcome, recipient, errorCode: "batch-failed" });
            }
        }
        return outcome;
    }

    private recordFailure({ outcome, recipient, errorCode }: { outcome: iChunkOutcome; recipient: iRecipient; errorCode: string }): void {
        outcome.failed += 1;
        // A dead token is removed from the user, so there is nothing left to retry for them
        if (!INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
            outcome.failedUserIds.push(recipient.userId);
        }
        outcome.reasons[errorCode] = (outcome.reasons[errorCode] ?? 0) + 1;
    }

    private async finishCampaign(campaignId: Types.ObjectId): Promise<void> {
        const campaign = await NotificationCampaignDb.findById(campaignId).select("stats").lean();
        const sent = campaign?.stats.sent ?? 0;
        const failed = campaign?.stats.failed ?? 0;

        let status = eNotificationCampaignStatus.COMPLETED;
        let errorMessage: string | null = null;
        if (failed > 0 && sent === 0) {
            status = eNotificationCampaignStatus.FAILED;
            errorMessage = "No notification could be delivered";
        } else if (failed > 0) {
            status = eNotificationCampaignStatus.PARTIAL;
        }

        await NotificationCampaignDb.updateOne({ _id: campaignId }, { $set: { status, errorMessage, completedAt: new Date() } });
    }

    private async markFailed({ campaignId, message }: { campaignId: Types.ObjectId; message: string }): Promise<void> {
        try {
            await NotificationCampaignDb.updateOne(
                { _id: campaignId },
                { $set: { status: eNotificationCampaignStatus.FAILED, errorMessage: message.slice(0, 500), completedAt: new Date() } }
            );
        } catch (err: unknown) {
            console.error("[NotificationService] Could not mark campaign as failed:", err);
        }
    }

    private buildMessage({ token, content, campaignId }: iBuildMessageArgs): Message {
        const imageUrl = content.imageUrl ?? undefined;
        // FCM data values must be strings; type tells the app this is an admin campaign
        const data: Record<string, string> = { type: NOTIFICATION_DATA_TYPE, campaignId };
        if (content.screen) {
            data.screen = content.screen;
        }
        if (content.url) {
            data.url = content.url;
        }

        return {
            token,
            notification: { title: content.title, body: content.body, ...(imageUrl && { imageUrl }) },
            data,
            android: {
                priority: "high",
                ttl: CAMPAIGN_TTL_SECONDS * 1000,
                notification: { sound: "default", ...(imageUrl && { imageUrl }) },
            },
            apns: {
                headers: { "apns-expiration": String(Math.floor(Date.now() / 1000) + CAMPAIGN_TTL_SECONDS) },
                payload: { aps: { sound: "default", ...(imageUrl && { mutableContent: true }) } },
                ...(imageUrl && { fcmOptions: { imageUrl } }),
            },
        };
    }

    private async removeInvalidTokens(recipients: iRecipient[]): Promise<void> {
        if (recipients.length === 0) {
            return;
        }
        try {
            // Match on the token too, so a token the user refreshed after this send is not wiped
            await UserDb.bulkWrite(
                recipients.map((r) => ({
                    updateOne: {
                        filter: { _id: r.userId, fcmToken: r.token },
                        update: { $unset: { fcmToken: "" } },
                    },
                }))
            );
            console.log(`[NotificationService] Removed ${recipients.length} invalid FCM token(s).`);
        } catch (err: unknown) {
            console.error("[NotificationService] Could not remove invalid FCM tokens:", err);
        }
    }
}
