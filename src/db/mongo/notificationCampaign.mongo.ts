import mongoose, { Model, Schema } from "mongoose";
import { iNotificationCampaign } from "../../interfaces/notification.interface";
import { cDbNames } from "../../consts/db.const";
import { eNotificationAudienceType, eNotificationCampaignStatus } from "../../enums/notification.enum";

type NotificationCampaignModel = Model<iNotificationCampaign>;

const NotificationCampaignSchema = new Schema<iNotificationCampaign>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        title: { type: String, required: true, trim: true },
        body: { type: String, required: true, trim: true },
        imageUrl: { type: String, default: null },
        screen: { type: String, default: null },
        url: { type: String, default: null },
        audience: {
            type: { type: String, enum: Object.values(eNotificationAudienceType), required: true },
            userIds: { type: [String], default: undefined },
            premium: { type: String },
            status: { type: String },
            platform: { type: String },
            registration: { type: String },
            appVersions: { type: [String], default: undefined },
        },
        status: { type: String, enum: Object.values(eNotificationCampaignStatus), required: true, index: true },
        scheduledAt: { type: Date, default: null },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        stats: {
            targeted: { type: Number, default: 0 },
            withoutToken: { type: Number, default: 0 },
            sent: { type: Number, default: 0 },
            failed: { type: Number, default: 0 },
            retryable: { type: Number, default: 0 },
        },
        failureReasons: { type: Schema.Types.Mixed, default: {} },
        failedUserIds: { type: [Schema.Types.ObjectId], default: [] },
        errorMessage: { type: String, default: null },
        idempotencyKey: { type: String },
        createdBy: { type: Schema.Types.ObjectId, required: true },
        createdByName: { type: String, default: null },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.notificationCampaign,
        minimize: false,
    }
);

NotificationCampaignSchema.index({ createdAt: -1 });
NotificationCampaignSchema.index({ status: 1, scheduledAt: 1 });
NotificationCampaignSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const NotificationCampaignDb: NotificationCampaignModel = mongoose.model<iNotificationCampaign>(
    cDbNames.notificationCampaign,
    NotificationCampaignSchema,
    cDbNames.notificationCampaign
);

export default NotificationCampaignDb;
