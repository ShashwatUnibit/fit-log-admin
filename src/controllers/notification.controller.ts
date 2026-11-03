import type { Request, Response } from "express";
import { Types } from "mongoose";
import { eHeadersKeys, eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { eNotificationCampaignStatus } from "../enums/notification.enum";
import { iResponse } from "../interfaces/response.interface";
import { iCampaignView, iNotificationCampaign, iSendNotificationPayload } from "../interfaces/notification.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import NotificationValidator from "../validators/notification.validator";
import NotificationService from "../services/notification.service";
import NotificationCampaignDb from "../db/mongo/notificationCampaign.mongo";
import AdminDb from "../db/mongo/admin.mongo";

interface iReplyArgs {
    req: Request;
    res: Response;
}

const MIN_SCHEDULE_LEAD_MS = 60 * 1000;
const MAX_SCHEDULE_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;
const MONGO_DUPLICATE_KEY = 11000;

export default class NotificationController {
    public static instance: NotificationController = new NotificationController();
    private constructor() { }

    public async getAudienceCount(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.audienceCountSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const counts = await NotificationService.instance.countAudience(validation.value.audience);
            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Audience calculated successfully",
                httpCode: eHttpStatusCode.OK,
                data: counts,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async sendNotification(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.sendSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const payload = validation.value;

            if (!NotificationService.instance.isReady()) {
                this.reply({ req, res }, {
                    status: eResponseStatus.ERROR,
                    message: "Push notifications are not configured on this server",
                    httpCode: eHttpStatusCode.SERVICE_UNAVAILABLE,
                });
                return;
            }

            if (payload.idempotencyKey) {
                const existing = await NotificationCampaignDb.findOne({ idempotencyKey: payload.idempotencyKey })
                    .select("-failedUserIds").lean();
                if (existing) {
                    this.replyCampaign({ req, res }, { campaign: existing, message: "Notification was already submitted" });
                    return;
                }
            }

            const scheduleError = this.checkScheduleTime(payload.scheduledAt);
            if (scheduleError) {
                this.reject({ req, res }, scheduleError);
                return;
            }

            const admin = await this.getAdmin(req);
            if (!admin) {
                this.reply({ req, res }, { status: eResponseStatus.ERROR, message: "Admin account not found", httpCode: eHttpStatusCode.UNAUTHORIZED });
                return;
            }

            const counts = await NotificationService.instance.countAudience(payload.audience);
            if (counts.reachable === 0) {
                this.reject({ req, res }, "No reachable users match this audience. Users without a device token cannot be notified.");
                return;
            }

            const isScheduled = payload.scheduledAt !== undefined;
            if (!isScheduled && await this.isAnotherCampaignSending()) {
                this.conflict({ req, res }, "Another notification is currently being sent. Wait for it to finish and try again.");
                return;
            }

            const campaign = await this.createCampaign({ payload, admin, counts, isScheduled });
            if (!isScheduled && campaign.status === eNotificationCampaignStatus.SENDING && campaign._id) {
                this.dispatch({ campaignId: campaign._id });
            }

            this.replyCampaign({ req, res }, {
                campaign,
                message: isScheduled ? "Notification scheduled successfully" : "Notification is being sent",
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async sendTestNotification(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.sendTestSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            if (!NotificationService.instance.isReady()) {
                this.reply({ req, res }, {
                    status: eResponseStatus.ERROR,
                    message: "Push notifications are not configured on this server",
                    httpCode: eHttpStatusCode.SERVICE_UNAVAILABLE,
                });
                return;
            }

            const admin = await this.getAdmin(req);
            if (!admin) {
                this.reply({ req, res }, { status: eResponseStatus.ERROR, message: "Admin account not found", httpCode: eHttpStatusCode.UNAUTHORIZED });
                return;
            }
            if (!admin.fcmToken) {
                this.reject({ req, res }, "Your admin account has no device token, so a test cannot be delivered. Sign in from a device that supports push notifications first.");
                return;
            }

            const result = await NotificationService.instance.sendTest({ token: admin.fcmToken, content: validation.value });
            if (!result.success) {
                this.reject({ req, res }, `Test notification failed (${result.errorCode ?? "unknown"}): ${result.errorMessage ?? "unknown error"}`);
                return;
            }

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Test notification sent to your device",
                httpCode: eHttpStatusCode.OK,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async listCampaigns(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.listQuerySchema.validate(req.query);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const { page, limit, status } = validation.value;
            const filter = status ? { status } : {};

            const [totalItems, campaigns] = await Promise.all([
                NotificationCampaignDb.countDocuments(filter),
                NotificationCampaignDb.find(filter)
                    .select("-failedUserIds")
                    .sort({ createdAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
            ]);

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Notifications fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    campaigns: campaigns.map((c) => this.toView(c)),
                    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
                },
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async getCampaign(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.idParamSchema.validate(req.params);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const campaign = await NotificationCampaignDb.findById(validation.value.id).select("-failedUserIds").lean();
            if (!campaign) {
                this.notFound({ req, res });
                return;
            }
            this.replyCampaign({ req, res }, { campaign, message: "Notification fetched successfully" });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async cancelCampaign(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.idParamSchema.validate(req.params);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const { id } = validation.value;
            const cancelled = await NotificationCampaignDb.findOneAndUpdate(
                { _id: id, status: eNotificationCampaignStatus.SCHEDULED },
                { $set: { status: eNotificationCampaignStatus.CANCELLED, completedAt: new Date() } },
                { new: true }
            ).select("-failedUserIds").lean();

            if (!cancelled) {
                await this.rejectUnavailableTransition({ req, res }, { id, message: "Only scheduled notifications can be cancelled" });
                return;
            }
            this.replyCampaign({ req, res }, { campaign: cancelled, message: "Notification cancelled successfully" });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async retryCampaign(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.idParamSchema.validate(req.params);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const { id } = validation.value;
            if (!NotificationService.instance.isReady()) {
                this.reply({ req, res }, {
                    status: eResponseStatus.ERROR,
                    message: "Push notifications are not configured on this server",
                    httpCode: eHttpStatusCode.SERVICE_UNAVAILABLE,
                });
                return;
            }
            if (await this.isAnotherCampaignSending()) {
                this.conflict({ req, res }, "Another notification is currently being sent. Wait for it to finish and try again.");
                return;
            }

            // new: false returns the document as it was, so the recipients that failed are still available
            const original = await NotificationCampaignDb.findOneAndUpdate(
                {
                    _id: id,
                    status: { $in: [eNotificationCampaignStatus.PARTIAL, eNotificationCampaignStatus.FAILED] },
                    "stats.retryable": { $gt: 0 },
                    "failedUserIds.0": { $exists: true },
                },
                {
                    $set: {
                        status: eNotificationCampaignStatus.SENDING,
                        startedAt: new Date(),
                        completedAt: null,
                        errorMessage: null,
                        "stats.failed": 0,
                        "stats.retryable": 0,
                        failedUserIds: [],
                        failureReasons: {},
                    },
                },
                { new: false }
            ).select("failedUserIds").lean();

            if (!original) {
                await this.rejectUnavailableTransition({ req, res }, { id, message: "Only notifications with retryable failed deliveries can be retried. A device that is no longer registered cannot be retried; it works again once the user opens the app." });
                return;
            }

            this.dispatch({ campaignId: new Types.ObjectId(id), retryUserIds: original.failedUserIds });

            const campaign = await NotificationCampaignDb.findById(id).select("-failedUserIds").lean();
            if (!campaign) {
                this.notFound({ req, res });
                return;
            }
            this.replyCampaign({ req, res }, { campaign, message: "Retrying failed deliveries" });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    private checkScheduleTime(scheduledAt: Date | undefined): string | null {
        if (scheduledAt === undefined) {
            return null;
        }
        const delay = scheduledAt.getTime() - Date.now();
        if (delay < MIN_SCHEDULE_LEAD_MS) {
            return `"scheduledAt" must be at least 1 minute in the future`;
        }
        if (delay > MAX_SCHEDULE_AHEAD_MS) {
            return `"scheduledAt" cannot be more than 90 days ahead`;
        }
        return null;
    }

    private async getAdmin(req: Request): Promise<{ _id: Types.ObjectId; fullName?: string; fcmToken?: string } | null> {
        const adminId = req.headers[eHeadersKeys.xUserId];
        if (typeof adminId !== "string" || !Types.ObjectId.isValid(adminId)) {
            return null;
        }
        return AdminDb.findOne({ _id: adminId, isDeleted: { $ne: true } }).select("fullName fcmToken").lean() as Promise<{ _id: Types.ObjectId; fullName?: string; fcmToken?: string } | null>;
    }

    private async isAnotherCampaignSending(): Promise<boolean> {
        const sending = await NotificationCampaignDb.exists({ status: eNotificationCampaignStatus.SENDING });
        return sending !== null;
    }

    private async createCampaign(args: {
        payload: iSendNotificationPayload;
        admin: { _id: Types.ObjectId; fullName?: string };
        counts: { reachable: number; withoutToken: number };
        isScheduled: boolean;
    }): Promise<iNotificationCampaign> {
        const { payload, admin, counts, isScheduled } = args;
        try {
            const created = await NotificationCampaignDb.create({
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl ?? null,
                screen: payload.screen ?? null,
                url: payload.url ?? null,
                audience: payload.audience,
                status: isScheduled ? eNotificationCampaignStatus.SCHEDULED : eNotificationCampaignStatus.SENDING,
                scheduledAt: payload.scheduledAt ?? null,
                startedAt: isScheduled ? null : new Date(),
                stats: { targeted: counts.reachable, withoutToken: counts.withoutToken, sent: 0, failed: 0, retryable: 0 },
                failureReasons: {},
                failedUserIds: [],
                idempotencyKey: payload.idempotencyKey,
                createdBy: admin._id,
                createdByName: admin.fullName ?? null,
            });
            return created.toObject();
        } catch (err: unknown) {
            // Two requests with the same idempotency key raced: return the one that won
            const isDuplicateKey = (err as { code?: number }).code === MONGO_DUPLICATE_KEY;
            if (isDuplicateKey && payload.idempotencyKey) {
                const existing = await NotificationCampaignDb.findOne({ idempotencyKey: payload.idempotencyKey })
                    .select("-failedUserIds").lean();
                if (existing) {
                    return existing;
                }
            }
            throw err;
        }
    }

    private dispatch(args: { campaignId: Types.ObjectId; retryUserIds?: Types.ObjectId[] }): void {
        NotificationService.instance.runCampaign(args).catch((err: unknown) => {
            console.error("[NotificationController] Campaign run crashed:", err);
        });
    }

    private async rejectUnavailableTransition({ req, res }: iReplyArgs, { id, message }: { id: string; message: string }): Promise<void> {
        const exists = await NotificationCampaignDb.exists({ _id: id });
        if (!exists) {
            this.notFound({ req, res });
            return;
        }
        this.conflict({ req, res }, message);
    }

    private toView(campaign: Omit<iNotificationCampaign, "failedUserIds">): iCampaignView {
        const { status, stats } = campaign;
        return {
            _id: String(campaign._id),
            title: campaign.title,
            body: campaign.body,
            imageUrl: campaign.imageUrl ?? null,
            screen: campaign.screen ?? null,
            url: campaign.url ?? null,
            audience: campaign.audience,
            status,
            scheduledAt: campaign.scheduledAt ?? null,
            startedAt: campaign.startedAt ?? null,
            completedAt: campaign.completedAt ?? null,
            stats,
            failureReasons: Object.entries(campaign.failureReasons).map(([code, count]) => ({ code, count })),
            errorMessage: campaign.errorMessage ?? null,
            createdBy: String(campaign.createdBy),
            createdByName: campaign.createdByName ?? null,
            canCancel: status === eNotificationCampaignStatus.SCHEDULED,
            // Campaigns saved before "retryable" existed have no value, which means nothing can be retried
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            canRetry: (status === eNotificationCampaignStatus.PARTIAL || status === eNotificationCampaignStatus.FAILED) && (stats.retryable ?? 0) > 0,
            createdAt: campaign.createdAt ?? null,
            updatedAt: campaign.updatedAt ?? null,
        };
    }

    private replyCampaign({ req, res }: iReplyArgs, { campaign, message }: { campaign: Omit<iNotificationCampaign, "failedUserIds">; message: string }): void {
        this.reply({ req, res }, {
            status: eResponseStatus.SUCCESS,
            message,
            httpCode: eHttpStatusCode.OK,
            data: this.toView(campaign),
        });
    }

    private reply({ req, res }: iReplyArgs, responseData: iResponse): void {
        EncryptionSecurity.instance.onResponse(req, res, responseData);
    }

    private reject({ req, res }: iReplyArgs, message: string): void {
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message, httpCode: eHttpStatusCode.BAD_REQUEST });
    }

    private conflict({ req, res }: iReplyArgs, message: string): void {
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message, httpCode: eHttpStatusCode.CONFLICT });
    }

    private notFound({ req, res }: iReplyArgs): void {
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message: "Notification not found", httpCode: eHttpStatusCode.NOT_FOUND });
    }

    private fail({ req, res }: iReplyArgs, err: unknown): void {
        const errorRes = toErrorResponse(err);
        this.reply({ req, res }, {
            status: eResponseStatus.FAIL,
            message: errorRes.message,
            httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
        });
    }
}
