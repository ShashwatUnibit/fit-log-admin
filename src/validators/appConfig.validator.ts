import Joi from "joi";
import { cAppConfigFields, cBaseAppVersion, eAppPlatform } from "../enums/appConfig.enum";
import {
    iAppConfigFields,
    iAppConfigHistoryQuery,
    iBulkForceUpdatePayload,
    iCreateAppConfigPayload,
    iEffectiveQuery,
    iForceUpdatePayload,
    iMaintenancePayload,
    iOtpPayload,
    iUpdateAppConfigPayload,
} from "../interfaces/appConfig.interface";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;
const MESSAGE_MAX = 300;

export default class AppConfigValidator {
    public static instance: AppConfigValidator = new AppConfigValidator();
    private constructor() {}

    private platform = Joi.string().valid(...Object.values(eAppPlatform)).required().messages({
        "any.only": `"platform" must be one of [${Object.values(eAppPlatform).join(", ")}]`,
        "any.required": `"platform" is a required field`,
        "string.empty": `"platform" cannot be empty`,
    });

    private version = Joi.string().trim().pattern(VERSION_PATTERN).messages({
        "string.pattern.base": `{#label} must look like 1.2.3`,
        "string.empty": `{#label} cannot be empty`,
    });

    private url = Joi.string().trim().uri({ scheme: ["http", "https"] }).messages({
        "string.uri": `{#label} must be a valid http(s) link`,
        "string.uriCustomScheme": `{#label} must be a valid http(s) link`,
        "string.empty": `{#label} cannot be empty`,
    });

    private forceUpdateEntry = Joi.object({
        enabled: Joi.boolean().strict().required().messages({
            "boolean.base": `{#label} must be true or false`,
            "any.required": `{#label} is a required field`,
        }),
        minVersion: this.version.allow(null).default(null),
    }).required();

    private forceUpdate = Joi.object({
        maintananceMode: Joi.boolean().strict().required().messages({
            "boolean.base": `{#label} must be true or false`,
            "any.required": `{#label} is a required field`,
        }),
        forceUpdateForPlatforms: Joi.object({
            ios: this.forceUpdateEntry,
            android: this.forceUpdateEntry,
        }).required(),
    });

    private companyPolicies = Joi.object({
        termsAndConditions: this.url.required(),
        privacyPolicy: this.url.required(),
        aboutUs: this.url.required(),
    });

    /** Keys of the managed fields; the base document must have the first four. */
    private fieldKeys(requiredForBase: boolean): Record<string, Joi.Schema> {
        // The message sits on the rule itself so it is not repeated for fields nested inside it
        const needed = (schema: Joi.Schema, field: string): Joi.Schema =>
            requiredForBase
                ? schema.when("appVersion", {
                    is: cBaseAppVersion,
                    then: Joi.required().messages({ "any.required": `"${field}" is required for a base configuration` }),
                })
                : schema;
        return {
            appName: needed(Joi.string().trim().min(1).max(80), "appName").messages({
                "string.empty": `"appName" cannot be empty`,
                "string.max": `"appName" must be at most {#limit} characters`,
            }),
            companyPolicies: needed(this.companyPolicies, "companyPolicies"),
            forceUpdate: needed(this.forceUpdate, "forceUpdate"),
            forceUpdateMessage: needed(Joi.string().trim().min(1).max(MESSAGE_MAX), "forceUpdateMessage").messages({
                "string.empty": `"forceUpdateMessage" cannot be empty`,
                "string.max": `"forceUpdateMessage" must be at most {#limit} characters`,
            }),
            isOtpEnabled: Joi.boolean().strict().messages({
                "boolean.base": `"isOtpEnabled" must be true or false`,
            }),
            supportEmail: Joi.string().trim().email({ tlds: { allow: false } }).max(120).allow(null).messages({
                "string.email": `"supportEmail" must be a valid email address`,
                "string.empty": `"supportEmail" cannot be empty`,
            }),
            supportPhone: Joi.string().trim().pattern(PHONE_PATTERN).allow(null).messages({
                "string.pattern.base": `"supportPhone" must be a phone number such as +91 98765 43210`,
                "string.empty": `"supportPhone" cannot be empty`,
            }),
            playStoreUrl: this.url.allow(null),
            appStoreUrl: this.url.allow(null),
            apkDownloadUrl: this.url.allow(null),
        };
    }

    public createSchema = Joi.object<iCreateAppConfigPayload>({
        platform: this.platform,
        appVersion: Joi.string().trim().pattern(new RegExp(`^(${cBaseAppVersion}|\\d+\\.\\d+\\.\\d+)$`)).required().messages({
            "string.pattern.base": `"appVersion" must be "${cBaseAppVersion}" or a version like 1.2.3`,
            "string.empty": `"appVersion" cannot be empty`,
            "any.required": `"appVersion" is a required field`,
        }),
        ...this.fieldKeys(true),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updateSchema = Joi.object<iUpdateAppConfigPayload>({
        expectedUpdatedAt: Joi.date().iso().allow(null).required().messages({
            "date.base": `"expectedUpdatedAt" must be a valid ISO date or null`,
            "date.format": `"expectedUpdatedAt" must be a valid ISO date or null`,
            "any.required": `"expectedUpdatedAt" is a required field (null when the configuration has no updatedAt)`,
        }),
        set: Joi.object<iAppConfigFields>(this.fieldKeys(false)).min(1).messages({
            "object.min": `"set" needs at least one field`,
        }),
        unset: Joi.array().items(Joi.string().valid(...cAppConfigFields)).min(1).unique().messages({
            "any.only": `"unset" can only contain [${cAppConfigFields.join(", ")}]`,
            "array.unique": `"unset" contains a field twice`,
        }),
    })
        .or("set", "unset")
        .messages({ "object.missing": `Send "set" or "unset" with the changes to make` })
        .options({ convert: true, abortEarly: true, allowUnknown: false });

    public forceUpdateSchema = Joi.object<iForceUpdatePayload>({
        expectedUpdatedAt: Joi.date().iso().allow(null).required().messages({
            "date.base": `"expectedUpdatedAt" must be a valid ISO date or null`,
            "any.required": `"expectedUpdatedAt" is a required field (null when the configuration has no updatedAt)`,
        }),
        enabled: Joi.boolean().strict().required().messages({
            "boolean.base": `"enabled" must be true or false`,
            "any.required": `"enabled" is a required field`,
        }),
        minVersion: this.version.allow(null).label("minVersion"),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public bulkForceUpdateSchema = Joi.object<iBulkForceUpdatePayload>({
        platform: this.platform,
        belowVersion: this.version.required().label("belowVersion").messages({
            "any.required": `"belowVersion" is a required field`,
        }),
        enabled: Joi.boolean().strict().required().messages({
            "boolean.base": `"enabled" must be true or false`,
            "any.required": `"enabled" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public maintenanceSchema = Joi.object<iMaintenancePayload>({
        platform: this.platform,
        enabled: Joi.boolean().strict().required().messages({
            "boolean.base": `"enabled" must be true or false`,
            "any.required": `"enabled" is a required field`,
        }),
        message: Joi.string().trim().min(1).max(MESSAGE_MAX).messages({
            "string.empty": `"message" cannot be empty`,
            "string.max": `"message" must be at most {#limit} characters`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public otpSchema = Joi.object<iOtpPayload>({
        platform: this.platform,
        enabled: Joi.boolean().strict().required().messages({
            "boolean.base": `"enabled" must be true or false`,
            "any.required": `"enabled" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public effectiveQuerySchema = Joi.object<iEffectiveQuery & { enc?: string }>({
        platform: this.platform,
        appVersion: Joi.string().trim().min(1).max(30).required().messages({
            "string.empty": `"appVersion" cannot be empty`,
            "string.max": `"appVersion" must be at most {#limit} characters`,
            "any.required": `"appVersion" is a required field`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public listQuerySchema = Joi.object<{ enc?: string }>({
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public historyQuerySchema = Joi.object<iAppConfigHistoryQuery & { enc?: string }>({
        page: Joi.number().integer().min(1).default(1).messages({
            "number.base": `"page" must be a number`,
            "number.min": `"page" must be at least 1`,
        }),
        limit: Joi.number().integer().min(1).max(50).default(20).messages({
            "number.base": `"limit" must be a number`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 50`,
        }),
        platform: Joi.string().valid(...Object.values(eAppPlatform)).messages({
            "any.only": `"platform" must be one of [${Object.values(eAppPlatform).join(", ")}]`,
        }),
        configId: Joi.string().trim().length(24).hex().messages({
            "string.length": `"configId" must be a valid id`,
            "string.hex": `"configId" must be a valid id`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public idParamSchema = Joi.object<{ id: string }>({
        id: Joi.string().trim().length(24).hex().required().messages({
            "string.length": `"id" must be a valid id`,
            "string.hex": `"id" must be a valid id`,
            "any.required": `"id" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
