export enum eNotificationAudienceType {
    ALL = "all",
    SEGMENT = "segment",
    USERS = "users",
}

export enum eNotificationCampaignStatus {
    SCHEDULED = "scheduled",
    SENDING = "sending",
    COMPLETED = "completed",
    PARTIAL = "partial",
    FAILED = "failed",
    CANCELLED = "cancelled",
}

export enum eNotificationPremiumFilter {
    PREMIUM = "premium",
    FREE = "free",
}

export enum eNotificationStatusFilter {
    ACTIVE = "active",
    INACTIVE = "inactive",
}

export enum eNotificationRegistrationFilter {
    COMPLETED = "completed",
    INCOMPLETE = "incomplete",
}

export enum eNotificationPlatform {
    ANDROID = "android",
    IOS = "ios",
}
