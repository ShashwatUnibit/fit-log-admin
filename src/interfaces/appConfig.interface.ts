import { Types } from "mongoose";
import { eAppConfigAction, eAppPlatform, tAppConfigField } from "../enums/appConfig.enum";

export interface iForceUpdateEntry {
    enabled: boolean;
    minVersion: string | null;
}

// "maintananceMode" is spelled like this in the user app and its database; keep it.
export interface iForceUpdate {
    maintananceMode: boolean;
    forceUpdateForPlatforms: { ios: iForceUpdateEntry; android: iForceUpdateEntry };
}

export interface iCompanyPolicies {
    termsAndConditions: string;
    privacyPolicy: string;
    aboutUs: string;
}

/**
 * Fields that can be set on a configuration document. The base document has all the required ones;
 * a version document holds only the fields it overrides. The user app merges them shallowly
 * ({ ...base, ...version }), so an object field in a version document replaces the base's whole object.
 */
export interface iAppConfigFields {
    appName?: string;
    companyPolicies?: iCompanyPolicies;
    forceUpdate?: iForceUpdate;
    forceUpdateMessage?: string;
    supportEmail?: string | null;
    supportPhone?: string | null;
    playStoreUrl?: string | null;
    appStoreUrl?: string | null;
    apkDownloadUrl?: string | null;
}

export interface iAppConfig extends iAppConfigFields {
    _id?: Types.ObjectId;
    appVersion: string;
    platform: eAppPlatform;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iAppConfigChange {
    path: string;
    before: unknown;
    after: unknown;
}

export interface iAppConfigHistory {
    _id?: Types.ObjectId;
    configId: Types.ObjectId;
    platform: eAppPlatform;
    appVersion: string;
    action: eAppConfigAction;
    changes: iAppConfigChange[];
    // The document after the change; for a delete, the document as it was before
    snapshot: iAppConfigFields;
    changedBy: Types.ObjectId;
    changedByName?: string | null;
    createdAt?: Date;
}

export interface iCreateAppConfigPayload extends iAppConfigFields {
    platform: eAppPlatform;
    appVersion: string;
}

export interface iUpdateAppConfigPayload {
    // updatedAt the admin last saw; null when the document has never been updated
    expectedUpdatedAt: Date | null;
    set?: iAppConfigFields;
    unset?: tAppConfigField[];
}

export interface iForceUpdatePayload {
    expectedUpdatedAt: Date | null;
    enabled: boolean;
    minVersion?: string | null;
}

export interface iBulkForceUpdatePayload {
    platform: eAppPlatform;
    belowVersion: string;
    enabled: boolean;
}

export interface iMaintenancePayload {
    platform: eAppPlatform;
    enabled: boolean;
    message?: string;
}

export interface iEffectiveQuery {
    platform: eAppPlatform;
    appVersion: string;
}

export interface iAppConfigHistoryQuery {
    page: number;
    limit: number;
    platform?: eAppPlatform;
    configId?: string;
}

export interface iAppConfigView extends iAppConfigFields {
    _id: string;
    platform: eAppPlatform;
    appVersion: string;
    isBase: boolean;
    // Fields this document sets; for a version document these are the ones it overrides
    overrides: tAppConfigField[];
    createdAt: Date | null;
    updatedAt: Date | null;
}

export interface iAppConfigPlatformView {
    platform: eAppPlatform;
    base: iAppConfigView | null;
    versions: iAppConfigView[];
}

export interface iEffectiveConfig {
    found: boolean;
    // Which document is missing when the app would get "Config not found"
    missing: "base" | "version" | null;
    message: string;
    config: (iAppConfigFields & { platform: eAppPlatform; appVersion: string }) | null;
    sources: Partial<Record<tAppConfigField, "base" | "version">>;
}

export interface iAppConfigHistoryView {
    _id: string;
    configId: string;
    platform: eAppPlatform;
    appVersion: string;
    action: eAppConfigAction;
    changes: iAppConfigChange[];
    changedByName: string | null;
    createdAt: Date | null;
}
