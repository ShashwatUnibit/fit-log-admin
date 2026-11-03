import { Types } from "mongoose";
import AppConfigDb from "../db/mongo/appConfig.mongo";
import AppConfigHistoryDb from "../db/mongo/appConfigHistory.mongo";
import {
    cAppConfigFields,
    cBaseAppVersion,
    eAppConfigAction,
    eAppPlatform,
    tAppConfigField,
} from "../enums/appConfig.enum";
import {
    iAppConfig,
    iAppConfigChange,
    iAppConfigFields,
    iAppConfigHistory,
    iAppConfigView,
    iEffectiveConfig,
    iForceUpdate,
    iForceUpdateEntry,
} from "../interfaces/appConfig.interface";

interface iBuildForceUpdateArgs {
    doc: iAppConfigFields;
    base: iAppConfigFields | null;
    platform: eAppPlatform;
    enabled: boolean;
    minVersion?: string | null;
}

export interface iRecordHistoryArgs {
    config: Pick<iAppConfig, "platform" | "appVersion"> & { _id: Types.ObjectId };
    action: eAppConfigAction;
    before: iAppConfigFields | null;
    after: iAppConfigFields | null;
    actor: { _id: Types.ObjectId; fullName?: string };
}

interface iApplyMaintenanceArgs {
    platform: eAppPlatform;
    enabled: boolean;
    // New text for the shared maintenance / update message, on the documents that set one
    message?: string;
    actor: iRecordHistoryArgs["actor"];
}

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const DEFAULT_ENTRY: iForceUpdateEntry = { enabled: false, minVersion: null };

export default class AppConfigService {
    public static instance: AppConfigService = new AppConfigService();
    private constructor() { }

    /** "1.2.3" as [1, 2, 3]; null when it is not that shape. */
    public parseVersion(version: string): number[] | null {
        const match = VERSION_PATTERN.exec(version);
        return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    }

    /** Negative when a is older than b, positive when newer, 0 when equal (or not comparable). */
    public compareVersions(a: string, b: string): number {
        const left = this.parseVersion(a);
        const right = this.parseVersion(b);
        if (!left || !right) {
            return 0;
        }
        for (let i = 0; i < 3; i++) {
            if (left[i] !== right[i]) {
                return left[i] - right[i];
            }
        }
        return 0;
    }

    /** Only the managed fields that are actually set on the document. */
    public pickFields(doc: iAppConfigFields): iAppConfigFields {
        const picked: Record<string, unknown> = {};
        for (const field of cAppConfigFields) {
            if (doc[field] !== undefined) {
                picked[field] = doc[field];
            }
        }
        return picked;
    }

    /**
     * What the user app builds for a request: the base document with the version document laid over it,
     * field by field (a shallow merge, exactly like `{ ...base, ...version }`).
     */
    public effective(args: {
        platform: eAppPlatform;
        appVersion: string;
        base: iAppConfig | null;
        version: iAppConfig | null;
    }): iEffectiveConfig {
        const { platform, appVersion, base, version } = args;
        if (!base) {
            return {
                found: false,
                missing: "base",
                message: `No base configuration exists for ${platform}. The app gets "Config not found" for every version until one is created.`,
                config: null,
                sources: {},
            };
        }
        if (!version) {
            return {
                found: false,
                missing: "version",
                message: `Version ${appVersion} has no configuration document. The app gets "Config not found" on this version until one is added.`,
                config: null,
                sources: {},
            };
        }

        const sources: iEffectiveConfig["sources"] = {};
        const merged: Record<string, unknown> = {};
        const layers: [("base" | "version"), iAppConfig][] = [["base", base], ["version", version]];
        for (const [source, doc] of layers) {
            for (const field of cAppConfigFields) {
                if (doc[field] !== undefined) {
                    merged[field] = doc[field];
                    sources[field] = source;
                }
            }
        }
        return {
            found: true,
            missing: null,
            message: "The app receives this configuration.",
            config: { ...(merged as iAppConfigFields), platform, appVersion },
            sources,
        };
    }

    /** A message when the resulting configuration would be unusable, otherwise null. */
    public checkEffective(platform: eAppPlatform, effective: iAppConfigFields): string | null {
        const entry = effective.forceUpdate?.forceUpdateForPlatforms[platform];
        if (!entry?.enabled) {
            return null;
        }
        const isAndroid = platform === eAppPlatform.ANDROID;
        const link = isAndroid ? effective.playStoreUrl : effective.appStoreUrl;
        if (!link) {
            return `Add the ${isAndroid ? "Play Store" : "App Store"} link before turning force update on for ${platform}, so users have somewhere to update.`;
        }
        return null;
    }

    /**
     * The full forceUpdate object for a document with this platform's entry set. A version document must carry
     * the whole object (maintenance flag and both platforms) because it replaces the base's object entirely.
     */
    public buildForceUpdate(args: iBuildForceUpdateArgs): iForceUpdate {
        const { doc, base, platform, enabled, minVersion } = args;
        const source = doc.forceUpdate ?? base?.forceUpdate;
        const current = source?.forceUpdateForPlatforms[platform];
        const entry: iForceUpdateEntry = {
            enabled,
            minVersion: minVersion === undefined ? (current?.minVersion ?? null) : minVersion,
        };
        return {
            // Maintenance follows the base so a version never keeps a stale copy of it
            maintananceMode: base?.forceUpdate?.maintananceMode ?? source?.maintananceMode ?? false,
            forceUpdateForPlatforms: {
                ios: source?.forceUpdateForPlatforms.ios ?? DEFAULT_ENTRY,
                android: source?.forceUpdateForPlatforms.android ?? DEFAULT_ENTRY,
                [platform]: entry,
            },
        };
    }

    public toView(doc: iAppConfig): iAppConfigView {
        const fields = this.pickFields(doc);
        return {
            ...fields,
            _id: String(doc._id),
            platform: doc.platform,
            appVersion: doc.appVersion,
            isBase: doc.appVersion === cBaseAppVersion,
            overrides: cAppConfigFields.filter((field): field is tAppConfigField => doc[field] !== undefined),
            createdAt: doc.createdAt ?? null,
            updatedAt: doc.updatedAt ?? null,
        };
    }

    /** Field-by-field differences between two states, with nested objects flattened to dotted paths. */
    public diff(before: iAppConfigFields | null, after: iAppConfigFields | null): iAppConfigChange[] {
        const left: Record<string, unknown> = {};
        const right: Record<string, unknown> = {};
        this.flatten({ value: before ?? {}, prefix: "", out: left });
        this.flatten({ value: after ?? {}, prefix: "", out: right });

        const changes: iAppConfigChange[] = [];
        for (const path of new Set([...Object.keys(left), ...Object.keys(right)])) {
            if (JSON.stringify(left[path] ?? null) !== JSON.stringify(right[path] ?? null)) {
                changes.push({ path, before: left[path] ?? null, after: right[path] ?? null });
            }
        }
        return changes;
    }

    public async recordHistory(args: iRecordHistoryArgs): Promise<void> {
        const { config, action, before, after, actor } = args;
        const snapshot = action === eAppConfigAction.DELETE ? before : after;
        const entry: iAppConfigHistory = {
            configId: config._id,
            platform: config.platform,
            appVersion: config.appVersion,
            action,
            changes: this.diff(before, after),
            snapshot: this.pickFields(snapshot ?? {}),
            changedBy: actor._id,
            changedByName: actor.fullName ?? null,
        };
        await AppConfigHistoryDb.create(entry);
    }

    /**
     * Makes every document of the platform agree on the maintenance flag. The user app takes a version
     * document's whole forceUpdate object over the base's, so a copy left behind would silently ignore the
     * switch. Returns how many documents changed.
     */
    public async applyMaintenance(args: iApplyMaintenanceArgs): Promise<number> {
        const { platform, enabled, message, actor } = args;
        const docs = await AppConfigDb.find({ platform }).lean();
        let changed = 0;

        for (const doc of docs) {
            const set: Record<string, unknown> = {};
            if (doc.forceUpdate && doc.forceUpdate.maintananceMode !== enabled) {
                set["forceUpdate.maintananceMode"] = enabled;
            }
            if (message !== undefined && doc.forceUpdateMessage !== undefined && doc.forceUpdateMessage !== message) {
                set.forceUpdateMessage = message;
            }
            if (Object.keys(set).length === 0) {
                continue;
            }

            const before = this.pickFields(doc);
            const updated = await AppConfigDb.findOneAndUpdate({ _id: doc._id }, { $set: set }, { returnDocument: "after" }).lean();
            if (updated) {
                await this.recordHistory({
                    config: { _id: doc._id, platform: doc.platform, appVersion: doc.appVersion },
                    action: eAppConfigAction.MAINTENANCE,
                    before,
                    after: this.pickFields(updated),
                    actor,
                });
                changed += 1;
            }
        }
        return changed;
    }

    private flatten({ value, prefix, out }: { value: unknown; prefix: string; out: Record<string, unknown> }): void {
        if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
            for (const [key, child] of Object.entries(value)) {
                this.flatten({ value: child, prefix: prefix ? `${prefix}.${key}` : key, out });
            }
            return;
        }
        out[prefix] = value;
    }
}
