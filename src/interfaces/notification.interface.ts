import { Types } from "mongoose";
import {
    eNotificationAudienceType,
    eNotificationCampaignStatus,
    eNotificationPlatform,
    eNotificationPremiumFilter,
    eNotificationRegistrationFilter,
    eNotificationStatusFilter,
} from "../enums/notification.enum";

export interface iNotificationContent {
    title: string;
    body: string;
    imageUrl?: string | null;
    // Optional destination the app opens when the notification is tapped (sent as FCM data)
    screen?: string | null;
    url?: string | null;
}

export interface iNotificationAudience {
    type: eNotificationAudienceType;
    // type "users": explicit recipients
    userIds?: string[];
    // type "segment": every given filter must match
    premium?: eNotificationPremiumFilter;
    status?: eNotificationStatusFilter;
    platform?: eNotificationPlatform;
    registration?: eNotificationRegistrationFilter;
    appVersions?: string[];
}

export interface iNotificationStats {
    targeted: number;
    withoutToken: number;
    sent: number;
    failed: number;
    // Failed recipients that can be tried again (a dead device token cannot)
    retryable: number;
}

export interface iNotificationCampaign extends iNotificationContent {
    _id?: Types.ObjectId;
    audience: iNotificationAudience;
    status: eNotificationCampaignStatus;
    scheduledAt?: Date | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    stats: iNotificationStats;
    // FCM error code -> number of recipients that failed with it
    failureReasons: Record<string, number>;
    // Recipients that failed, kept (capped) so the campaign can be retried
    failedUserIds: Types.ObjectId[];
    errorMessage?: string | null;
    idempotencyKey?: string;
    createdBy: Types.ObjectId;
    createdByName?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iNotificationTemplate extends iNotificationContent {
    _id?: Types.ObjectId;
    name: string;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iSendNotificationPayload extends iNotificationContent {
    audience: iNotificationAudience;
    scheduledAt?: Date;
    idempotencyKey?: string;
}

export interface iAudienceCountPayload {
    audience: iNotificationAudience;
}

export type iSendTestNotificationPayload = iNotificationContent;

export interface iAudienceCount {
    matched: number;
    reachable: number;
    withoutToken: number;
}

export interface iNotificationListQuery {
    page: number;
    limit: number;
    status?: eNotificationCampaignStatus;
}

export interface iTemplatePayload extends iNotificationContent {
    name: string;
}

export interface iUpdateTemplatePayload {
    name?: string;
    title?: string;
    body?: string;
    imageUrl?: string | null;
    screen?: string | null;
    url?: string | null;
}

export interface iCampaignView extends iNotificationContent {
    _id: string;
    audience: iNotificationAudience;
    status: eNotificationCampaignStatus;
    scheduledAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    stats: iNotificationStats;
    failureReasons: { code: string; count: number }[];
    errorMessage: string | null;
    createdBy: string;
    createdByName: string | null;
    canCancel: boolean;
    canRetry: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
}
