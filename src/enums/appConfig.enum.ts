export enum eAppPlatform {
    ANDROID = "android",
    IOS = "ios",
}

export enum eAppConfigAction {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    RESTORE = "restore",
    MAINTENANCE = "maintenance",
    FORCE_UPDATE = "force_update",
    OTP = "otp",
}

// The appVersion value of the document every version of a platform inherits from.
export const cBaseAppVersion = "base";

// Fields of a configuration document an admin can manage, in the order they are shown.
export const cAppConfigFields = [
    "appName",
    "companyPolicies",
    "forceUpdate",
    "forceUpdateMessage",
    "isOtpEnabled",
    "supportEmail",
    "supportPhone",
    "playStoreUrl",
    "appStoreUrl",
    "apkDownloadUrl",
] as const;

export type tAppConfigField = typeof cAppConfigFields[number];
