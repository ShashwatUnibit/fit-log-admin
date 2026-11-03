import type { Request, Response } from "express";
import { Types } from "mongoose";
import type { QueryFilter, UpdateQuery } from "mongoose";
import AdminDb from "../db/mongo/admin.mongo";
import AppConfigDb from "../db/mongo/appConfig.mongo";
import AppConfigHistoryDb from "../db/mongo/appConfigHistory.mongo";
import { eAdminType } from "../enums/admin.enum";
import { cAppConfigFields, cBaseAppVersion, eAppConfigAction, eAppPlatform } from "../enums/appConfig.enum";
import { eHeadersKeys, eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import {
    iAppConfig,
    iAppConfigFields,
    iAppConfigHistoryView,
    iAppConfigPlatformView,
    iForceUpdate,
} from "../interfaces/appConfig.interface";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import AppConfigService from "../services/appConfig.service";
import { toErrorResponse } from "../utils/common.util";
import AppConfigValidator from "../validators/appConfig.validator";

interface iReplyArgs {
    req: Request;
    res: Response;
}

interface iActor {
    _id: Types.ObjectId;
    fullName?: string;
}

type tConfigDoc = iAppConfig & { _id: Types.ObjectId };

const MONGO_DUPLICATE_KEY = 11000;
const STALE_MESSAGE = "This configuration was changed by someone else. Reload it and try again.";

export default class AppConfigController {
    public static instance: AppConfigController = new AppConfigController();
    private constructor() { }

    public async listConfigs(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.listQuerySchema.validate(req.query);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const service = AppConfigService.instance;
            const docs = await AppConfigDb.find({ platform: { $in: Object.values(eAppPlatform) } }).lean() as tConfigDoc[];

            const platforms: iAppConfigPlatformView[] = Object.values(eAppPlatform).map((platform) => {
                const ofPlatform = docs.filter((doc) => doc.platform === platform);
                const base = ofPlatform.find((doc) => doc.appVersion === cBaseAppVersion);
                const versions = ofPlatform
                    .filter((doc) => doc.appVersion !== cBaseAppVersion)
                    .sort((a, b) => service.compareVersions(b.appVersion, a.appVersion));
                return {
                    platform,
                    base: base ? service.toView(base) : null,
                    versions: versions.map((doc) => service.toView(doc)),
                };
            });

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "App configurations fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: { platforms },
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    /** What the user app would receive for this platform and version, or why it would fail. */
    public async getEffective(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.effectiveQuerySchema.validate(req.query);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const { platform, appVersion } = validation.value;
            const base = await this.findBase(platform);
            const version = appVersion === cBaseAppVersion
                ? base
                : (await AppConfigDb.findOne({ platform, appVersion }).lean() as tConfigDoc | null);

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Effective configuration calculated successfully",
                httpCode: eHttpStatusCode.OK,
                data: AppConfigService.instance.effective({ platform, appVersion, base, version }),
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async createConfig(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.createSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const actor = await this.requireSuperAdmin({ req, res });
            if (!actor) {
                return;
            }

            const service = AppConfigService.instance;
            const { platform, appVersion } = validation.value;
            const isBase = appVersion === cBaseAppVersion;

            if (await AppConfigDb.exists({ platform, appVersion })) {
                this.conflict({ req, res }, `A configuration for ${platform} ${isBase ? "base" : appVersion} already exists`);
                return;
            }
            const base = isBase ? null : await this.findBase(platform);
            if (!isBase && !base) {
                this.conflict({ req, res }, `Create the base configuration for ${platform} first. Every version inherits from it.`);
                return;
            }

            // A base configuration starts with every optional contact and store link empty, like the user app's own schema
            const fields: iAppConfigFields = isBase
                ? { supportEmail: null, supportPhone: null, playStoreUrl: null, appStoreUrl: null, apkDownloadUrl: null, ...service.pickFields(validation.value) }
                : service.pickFields(validation.value);

            const problem = this.validateFields({ platform, base, fields });
            if (problem) {
                this.reject({ req, res }, problem);
                return;
            }

            const created = await AppConfigDb.create({ platform, appVersion, ...fields });
            const doc = created.toObject() as tConfigDoc;
            await service.recordHistory({
                config: { _id: doc._id, platform, appVersion },
                action: eAppConfigAction.CREATE,
                before: null,
                after: service.pickFields(doc),
                actor,
            });

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: isBase ? `Base configuration for ${platform} created successfully` : `Configuration for ${platform} ${appVersion} created successfully`,
                httpCode: eHttpStatusCode.OK,
                data: service.toView(doc),
            });
        } catch (err: unknown) {
            if ((err as { code?: number }).code === MONGO_DUPLICATE_KEY) {
                this.conflict({ req, res }, "This configuration already exists");
                return;
            }
            this.fail({ req, res }, err);
        }
    }

    public async updateConfig(req: Request, res: Response): Promise<void> {
        const idValidation = AppConfigValidator.instance.idParamSchema.validate(req.params);
        if (idValidation.error) {
            this.reject({ req, res }, idValidation.error.message);
            return;
        }
        const validation = AppConfigValidator.instance.updateSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const actor = await this.requireSuperAdmin({ req, res });
            if (!actor) {
                return;
            }

            const service = AppConfigService.instance;
            const doc = await AppConfigDb.findById(idValidation.value.id).lean() as tConfigDoc | null;
            if (!doc) {
                this.notFound({ req, res });
                return;
            }

            const { expectedUpdatedAt, set, unset } = validation.value;
            const isBase = doc.appVersion === cBaseAppVersion;
            const setFields = service.pickFields(set ?? {});
            const overlap = (unset ?? []).find((field) => field in setFields);
            if (overlap) {
                this.reject({ req, res }, `"${overlap}" cannot be in both "set" and "unset"`);
                return;
            }
            if (isBase && unset?.length) {
                this.reject({ req, res }, "A base configuration cannot remove fields. Set a new value instead.");
                return;
            }

            const before = service.pickFields(doc);
            const removed = new Set<string>(unset ?? []);
            const after: Record<string, unknown> = Object.fromEntries(
                Object.entries({ ...before, ...setFields }).filter(([field]) => !removed.has(field))
            );

            if (service.diff(before, after).length === 0) {
                this.reply({ req, res }, {
                    status: eResponseStatus.SUCCESS,
                    message: "Nothing to change",
                    httpCode: eHttpStatusCode.OK,
                    data: service.toView(doc),
                });
                return;
            }

            const base = isBase ? null : await this.findBase(doc.platform);
            const problem = this.validateFields({ platform: doc.platform, base, fields: after });
            if (problem) {
                this.reject({ req, res }, problem);
                return;
            }

            const update: Record<string, Record<string, unknown>> = {};
            if (Object.keys(setFields).length > 0) {
                update.$set = { ...setFields };
            }
            if (unset?.length) {
                update.$unset = Object.fromEntries(unset.map((field) => [field, ""]));
            }
            const updated = await this.updateGuarded({ doc, expectedUpdatedAt, update });
            if (!updated) {
                this.conflict({ req, res }, STALE_MESSAGE);
                return;
            }

            await service.recordHistory({
                config: { _id: doc._id, platform: doc.platform, appVersion: doc.appVersion },
                action: eAppConfigAction.UPDATE,
                before,
                after: service.pickFields(updated),
                actor,
            });
            await this.syncMaintenanceIfChanged({ before, after: service.pickFields(updated), doc, actor });

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Configuration updated successfully",
                httpCode: eHttpStatusCode.OK,
                data: service.toView(updated),
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async deleteConfig(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.idParamSchema.validate(req.params);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const actor = await this.requireSuperAdmin({ req, res });
            if (!actor) {
                return;
            }

            const doc = await AppConfigDb.findById(validation.value.id).lean() as tConfigDoc | null;
            if (!doc) {
                this.notFound({ req, res });
                return;
            }
            if (doc.appVersion === cBaseAppVersion) {
                this.conflict({ req, res }, "A base configuration cannot be deleted. Every version of the platform inherits from it.");
                return;
            }

            const service = AppConfigService.instance;
            await AppConfigDb.deleteOne({ _id: doc._id });
            await service.recordHistory({
                config: { _id: doc._id, platform: doc.platform, appVersion: doc.appVersion },
                action: eAppConfigAction.DELETE,
                before: service.pickFields(doc),
                after: null,
                actor,
            });

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: `Configuration for ${doc.platform} ${doc.appVersion} deleted. Users on that version get "Config not found" until it is restored or recreated.`,
                httpCode: eHttpStatusCode.OK,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    /** Forces (or stops forcing) an update on the users of one configuration document. */
    public async setForceUpdate(req: Request, res: Response): Promise<void> {
        const idValidation = AppConfigValidator.instance.idParamSchema.validate(req.params);
        if (idValidation.error) {
            this.reject({ req, res }, idValidation.error.message);
            return;
        }
        const validation = AppConfigValidator.instance.forceUpdateSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const actor = await this.requireSuperAdmin({ req, res });
            if (!actor) {
                return;
            }

            const service = AppConfigService.instance;
            const doc = await AppConfigDb.findById(idValidation.value.id).lean() as tConfigDoc | null;
            if (!doc) {
                this.notFound({ req, res });
                return;
            }

            const { expectedUpdatedAt, enabled, minVersion } = validation.value;
            const isBase = doc.appVersion === cBaseAppVersion;
            const base = isBase ? null : await this.findBase(doc.platform);
            if (!isBase && !base) {
                this.conflict({ req, res }, `Create the base configuration for ${doc.platform} first.`);
                return;
            }

            const forceUpdate = service.buildForceUpdate({ doc, base: base ?? doc, platform: doc.platform, enabled, minVersion });
            const before = service.pickFields(doc);
            const problem = this.validateFields({ platform: doc.platform, base, fields: { ...before, forceUpdate } });
            if (problem) {
                this.reject({ req, res }, problem);
                return;
            }

            const update = this.forceUpdateUpdate({ isBase, base, forceUpdate });
            const updated = await this.updateGuarded({ doc, expectedUpdatedAt, update });
            if (!updated) {
                this.conflict({ req, res }, STALE_MESSAGE);
                return;
            }

            await service.recordHistory({
                config: { _id: doc._id, platform: doc.platform, appVersion: doc.appVersion },
                action: eAppConfigAction.FORCE_UPDATE,
                before,
                after: service.pickFields(updated),
                actor,
            });

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: enabled
                    ? `Users on ${doc.platform} ${isBase ? "(all versions)" : doc.appVersion} must now update`
                    : `Force update turned off for ${doc.platform} ${isBase ? "(all versions)" : doc.appVersion}`,
                httpCode: eHttpStatusCode.OK,
                data: service.toView(updated),
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    /** Forces every version older than `belowVersion` to update (or lifts it), like a minimum supported version. */
    public async bulkForceUpdate(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.bulkForceUpdateSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const actor = await this.requireSuperAdmin({ req, res });
            if (!actor) {
                return;
            }

            const service = AppConfigService.instance;
            const { platform, belowVersion, enabled } = validation.value;
            const base = await this.findBase(platform);
            if (!base) {
                this.conflict({ req, res }, `Create the base configuration for ${platform} first.`);
                return;
            }

            const minVersion = enabled ? belowVersion : null;
            const newBase = service.buildForceUpdate({
                doc: base,
                base,
                platform,
                enabled: base.forceUpdate?.forceUpdateForPlatforms[platform].enabled ?? false,
                minVersion,
            });
            const versions = (await AppConfigDb.find({ platform, appVersion: { $ne: cBaseAppVersion } }).lean() as tConfigDoc[])
                .filter((doc) => service.parseVersion(doc.appVersion) !== null && service.compareVersions(doc.appVersion, belowVersion) < 0);

            const plan = versions.map((doc) => ({
                doc,
                forceUpdate: service.buildForceUpdate({ doc, base: { ...base, forceUpdate: newBase }, platform, enabled, minVersion }),
            }));
            for (const { doc, forceUpdate } of plan) {
                const problem = this.validateFields({ platform, base, fields: { ...service.pickFields(doc), forceUpdate } });
                if (problem) {
                    this.reject({ req, res }, problem);
                    return;
                }
            }

            await this.writeForceUpdate({ doc: base, forceUpdate: newBase, isBase: true, base: null, actor });
            for (const { doc, forceUpdate } of plan) {
                await this.writeForceUpdate({ doc, forceUpdate, isBase: false, base: { ...base, forceUpdate: newBase }, actor });
            }

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: enabled
                    ? `Users on ${platform} versions below ${belowVersion} must now update (${versions.length} version configuration${versions.length === 1 ? "" : "s"})`
                    : `Force update lifted for ${platform} versions below ${belowVersion} (${versions.length} version configuration${versions.length === 1 ? "" : "s"})`,
                httpCode: eHttpStatusCode.OK,
                data: { updated: versions.length, versions: versions.map((doc) => doc.appVersion), platform, belowVersion, enabled },
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    /** Turns maintenance mode on or off for the whole platform. */
    public async setMaintenance(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.maintenanceSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const actor = await this.requireSuperAdmin({ req, res });
            if (!actor) {
                return;
            }

            const { platform, enabled, message } = validation.value;
            const base = await this.findBase(platform);
            if (!base) {
                this.conflict({ req, res }, `Create the base configuration for ${platform} first.`);
                return;
            }

            const updated = await AppConfigService.instance.applyMaintenance({ platform, enabled, message, actor });
            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: enabled ? `Maintenance mode is ON for ${platform}` : `Maintenance mode is OFF for ${platform}`,
                httpCode: eHttpStatusCode.OK,
                data: { updated, platform, enabled },
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async getHistory(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.historyQuerySchema.validate(req.query);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const { page, limit, platform, configId } = validation.value;
            const filter: Record<string, unknown> = {};
            if (platform) {
                filter.platform = platform;
            }
            if (configId) {
                filter.configId = new Types.ObjectId(configId);
            }

            const [totalItems, entries] = await Promise.all([
                AppConfigHistoryDb.countDocuments(filter),
                AppConfigHistoryDb.find(filter)
                    .select("-snapshot")
                    .sort({ createdAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
            ]);

            const views: iAppConfigHistoryView[] = entries.map((entry) => ({
                _id: String(entry._id),
                configId: String(entry.configId),
                platform: entry.platform,
                appVersion: entry.appVersion,
                action: entry.action,
                changes: entry.changes,
                changedByName: entry.changedByName ?? null,
                createdAt: entry.createdAt ?? null,
            }));

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Change history fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    entries: views,
                    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
                },
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    /**
     * Puts a configuration back to how it was right after the chosen change (or, for a delete, as it was just
     * before). A deleted configuration is created again with its old id.
     */
    public async restoreHistory(req: Request, res: Response): Promise<void> {
        const validation = AppConfigValidator.instance.idParamSchema.validate(req.params);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const actor = await this.requireSuperAdmin({ req, res });
            if (!actor) {
                return;
            }

            const service = AppConfigService.instance;
            const entry = await AppConfigHistoryDb.findById(validation.value.id).lean();
            if (!entry) {
                this.reply({ req, res }, { status: eResponseStatus.ERROR, message: "History entry not found", httpCode: eHttpStatusCode.NOT_FOUND });
                return;
            }

            const { platform, appVersion } = entry;
            const isBase = appVersion === cBaseAppVersion;
            const base = isBase ? null : await this.findBase(platform);
            if (!isBase && !base) {
                this.conflict({ req, res }, `Create the base configuration for ${platform} first.`);
                return;
            }

            let snapshot = service.pickFields(entry.snapshot);
            // A version never keeps its own maintenance setting: it always follows the base
            if (base?.forceUpdate && snapshot.forceUpdate) {
                snapshot = { ...snapshot, forceUpdate: { ...snapshot.forceUpdate, maintananceMode: base.forceUpdate.maintananceMode } };
            }
            const problem = this.validateFields({ platform, base, fields: snapshot });
            if (problem) {
                this.reject({ req, res }, problem);
                return;
            }

            const current = await AppConfigDb.findById(entry.configId).lean() as tConfigDoc | null;
            const restored = current
                ? await this.restoreExisting({ current, snapshot })
                : await this.recreate({ entry, snapshot });
            if (!restored) {
                this.conflict({ req, res }, `A configuration for ${platform} ${appVersion} already exists`);
                return;
            }

            await service.recordHistory({
                config: { _id: restored._id, platform, appVersion },
                action: eAppConfigAction.RESTORE,
                before: current ? service.pickFields(current) : null,
                after: service.pickFields(restored),
                actor,
            });
            if (isBase && restored.forceUpdate) {
                await service.applyMaintenance({ platform, enabled: restored.forceUpdate.maintananceMode, actor });
            }

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Configuration restored successfully",
                httpCode: eHttpStatusCode.OK,
                data: service.toView(restored),
            });
        } catch (err: unknown) {
            if ((err as { code?: number }).code === MONGO_DUPLICATE_KEY) {
                this.conflict({ req, res }, "This configuration already exists");
                return;
            }
            this.fail({ req, res }, err);
        }
    }

    private findBase(platform: eAppPlatform): Promise<tConfigDoc | null> {
        return AppConfigDb.findOne({ platform, appVersion: cBaseAppVersion }).lean();
    }

    /** Rules a configuration must satisfy; null when it is fine. */
    private validateFields({ platform, base, fields }: { platform: eAppPlatform; base: tConfigDoc | null; fields: iAppConfigFields }): string | null {
        const baseMaintenance = base?.forceUpdate?.maintananceMode;
        if (fields.forceUpdate && baseMaintenance !== undefined && fields.forceUpdate.maintananceMode !== baseMaintenance) {
            return "Maintenance mode applies to the whole platform. Use the maintenance switch instead of setting it on one version.";
        }
        const service = AppConfigService.instance;
        const effective = base ? { ...service.pickFields(base), ...fields } : fields;
        return service.checkEffective(platform, effective);
    }

    /** Applies an update only if the document still has the updatedAt the admin saw. */
    private updateGuarded(args: { doc: tConfigDoc; expectedUpdatedAt: Date | null; update: UpdateQuery<iAppConfig> }): Promise<tConfigDoc | null> {
        const { doc, expectedUpdatedAt, update } = args;
        // null matches a document that has never been updated (no updatedAt at all)
        const filter = { _id: doc._id, updatedAt: expectedUpdatedAt } as QueryFilter<iAppConfig>;
        return AppConfigDb.findOneAndUpdate(filter, update, { returnDocument: "after" }).lean();
    }

    /** A version whose forceUpdate would equal the base's inherits it instead of keeping a copy. */
    private forceUpdateUpdate(args: { isBase: boolean; base: tConfigDoc | null; forceUpdate: iForceUpdate }): UpdateQuery<iAppConfig> {
        const { isBase, base, forceUpdate } = args;
        const sameAsBase = !isBase && JSON.stringify(base?.forceUpdate) === JSON.stringify(forceUpdate);
        return (sameAsBase ? { $unset: { forceUpdate: "" } } : { $set: { forceUpdate } });
    }

    private async writeForceUpdate(args: { doc: tConfigDoc; forceUpdate: iForceUpdate; isBase: boolean; base: tConfigDoc | null; actor: iActor }): Promise<void> {
        const { doc, forceUpdate, isBase, base, actor } = args;
        const service = AppConfigService.instance;
        const before = service.pickFields(doc);
        const updated = await AppConfigDb.findOneAndUpdate({ _id: doc._id }, this.forceUpdateUpdate({ isBase, base, forceUpdate }), { returnDocument: "after" }).lean() as tConfigDoc | null;
        if (updated && service.diff(before, service.pickFields(updated)).length > 0) {
            await service.recordHistory({
                config: { _id: doc._id, platform: doc.platform, appVersion: doc.appVersion },
                action: eAppConfigAction.FORCE_UPDATE,
                before,
                after: service.pickFields(updated),
                actor,
            });
        }
    }

    /** After a base update that flipped maintenance mode, make the versions that copy forceUpdate agree. */
    private async syncMaintenanceIfChanged(args: { before: iAppConfigFields; after: iAppConfigFields; doc: tConfigDoc; actor: iActor }): Promise<void> {
        const { before, after, doc, actor } = args;
        const next = after.forceUpdate?.maintananceMode;
        if (doc.appVersion === cBaseAppVersion && next !== undefined && next !== before.forceUpdate?.maintananceMode) {
            await AppConfigService.instance.applyMaintenance({ platform: doc.platform, enabled: next, actor });
        }
    }

    private async restoreExisting({ current, snapshot }: { current: tConfigDoc; snapshot: iAppConfigFields }): Promise<tConfigDoc | null> {
        const isBase = current.appVersion === cBaseAppVersion;
        const set: Record<string, unknown> = { ...snapshot };
        // A base keeps its required fields; a version drops overrides the snapshot did not have
        const unset: Record<string, string> = {};
        if (!isBase) {
            for (const field of cAppConfigFields) {
                if (snapshot[field] === undefined && current[field] !== undefined) {
                    unset[field] = "";
                }
            }
        }
        const update: Record<string, unknown> = {};
        if (Object.keys(set).length > 0) {
            update.$set = set;
        }
        if (Object.keys(unset).length > 0) {
            update.$unset = unset;
        }
        if (Object.keys(update).length === 0) {
            return current;
        }
        return AppConfigDb.findOneAndUpdate({ _id: current._id }, update as UpdateQuery<iAppConfig>, { returnDocument: "after" }).lean();
    }

    private async recreate({ entry, snapshot }: { entry: { configId: Types.ObjectId; platform: eAppPlatform; appVersion: string }; snapshot: iAppConfigFields }): Promise<tConfigDoc | null> {
        const { configId, platform, appVersion } = entry;
        if (await AppConfigDb.exists({ platform, appVersion })) {
            return null;
        }
        const created = await AppConfigDb.create({ _id: configId, platform, appVersion, ...snapshot });
        return created.toObject();
    }

    /** Only a superAdmin may change the configuration, because it affects every user of the app. */
    private async requireSuperAdmin({ req, res }: iReplyArgs): Promise<iActor | null> {
        const adminId = req.headers[eHeadersKeys.xUserId];
        const admin = typeof adminId === "string" && Types.ObjectId.isValid(adminId)
            ? await AdminDb.findOne({ _id: adminId, isDeleted: false, isActive: true }).select("fullName adminType").lean()
            : null;

        if (admin?.adminType !== eAdminType.SUPERADMIN) {
            this.reply({ req, res }, {
                status: eResponseStatus.ERROR,
                message: "Only a superAdmin can change the app configuration",
                httpCode: eHttpStatusCode.FORBIDDEN,
            });
            return null;
        }
        return { _id: admin._id as unknown as Types.ObjectId, fullName: admin.fullName };
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
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message: "Configuration not found", httpCode: eHttpStatusCode.NOT_FOUND });
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
