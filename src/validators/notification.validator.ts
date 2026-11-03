import Joi from "joi";
import {
    eNotificationAudienceType,
    eNotificationCampaignStatus,
    eNotificationPlatform,
    eNotificationPremiumFilter,
    eNotificationRegistrationFilter,
    eNotificationStatusFilter,
} from "../enums/notification.enum";
import {
    iAudienceCountPayload,
    iNotificationListQuery,
    iSendNotificationPayload,
    iSendTestNotificationPayload,
    iTemplatePayload,
    iUpdateTemplatePayload,
} from "../interfaces/notification.interface";

const TITLE_MAX = 65;
const BODY_MAX = 240;
const USER_IDS_MAX = 500;

export default class NotificationValidator {
    public static instance: NotificationValidator = new NotificationValidator();
    private constructor() {}

    private contentKeys(isRequired: boolean): Record<string, Joi.Schema> {
        const required = (schema: Joi.StringSchema): Joi.StringSchema => (isRequired ? schema.required() : schema);
        return {
            title: required(Joi.string().trim().max(TITLE_MAX)).messages({
                "string.base": `"title" should be a type of 'text'`,
                "string.empty": `"title" cannot be empty`,
                "string.max": `"title" must be at most {#limit} characters`,
                "any.required": `"title" is a required field`,
            }),
            body: required(Joi.string().trim().max(BODY_MAX)).messages({
                "string.base": `"body" should be a type of 'text'`,
                "string.empty": `"body" cannot be empty`,
                "string.max": `"body" must be at most {#limit} characters`,
                "any.required": `"body" is a required field`,
            }),
            imageUrl: Joi.string().trim().uri({ scheme: ["http", "https"] }).empty("").allow(null).messages({
                "string.uri": `"imageUrl" must be a valid http(s) URL`,
                "string.uriCustomScheme": `"imageUrl" must be a valid http(s) URL`,
            }),
            screen: Joi.string().trim().max(100).empty("").allow(null).messages({
                "string.max": `"screen" must be at most {#limit} characters`,
            }),
            url: Joi.string().trim().uri({ scheme: ["http", "https"] }).empty("").allow(null).messages({
                "string.uri": `"url" must be a valid http(s) URL`,
                "string.uriCustomScheme": `"url" must be a valid http(s) URL`,
            }),
        };
    }

    private segmentOnly(schema: Joi.Schema): Joi.Schema {
        return schema.when("type", {
            is: eNotificationAudienceType.SEGMENT,
            then: Joi.optional(),
            otherwise: Joi.forbidden(),
        });
    }

    private audience = Joi.object({
        type: Joi.string().valid(...Object.values(eNotificationAudienceType)).required().messages({
            "any.only": `"audience.type" must be one of [${Object.values(eNotificationAudienceType).join(", ")}]`,
            "any.required": `"audience.type" is a required field`,
        }),
        userIds: Joi.array()
            .items(Joi.string().hex().length(24))
            .min(1)
            .max(USER_IDS_MAX)
            .unique()
            .when("type", { is: eNotificationAudienceType.USERS, then: Joi.required(), otherwise: Joi.forbidden() })
            .messages({
                "array.min": `"audience.userIds" needs at least {#limit} user`,
                "array.max": `"audience.userIds" can contain at most {#limit} users`,
                "array.unique": `"audience.userIds" contains duplicate users`,
                "string.hex": `"audience.userIds" must contain valid user ids`,
                "string.length": `"audience.userIds" must contain valid user ids`,
                "any.required": `"audience.userIds" is required when type is "users"`,
                "any.unknown": `"audience.userIds" is only allowed when type is "users"`,
            }),
        premium: this.segmentOnly(Joi.string().valid(...Object.values(eNotificationPremiumFilter))).messages({
            "any.only": `"audience.premium" must be one of [${Object.values(eNotificationPremiumFilter).join(", ")}]`,
            "any.unknown": `"audience.premium" is only allowed when type is "segment"`,
        }),
        status: this.segmentOnly(Joi.string().valid(...Object.values(eNotificationStatusFilter))).messages({
            "any.only": `"audience.status" must be one of [${Object.values(eNotificationStatusFilter).join(", ")}]`,
            "any.unknown": `"audience.status" is only allowed when type is "segment"`,
        }),
        platform: this.segmentOnly(Joi.string().valid(...Object.values(eNotificationPlatform))).messages({
            "any.only": `"audience.platform" must be one of [${Object.values(eNotificationPlatform).join(", ")}]`,
            "any.unknown": `"audience.platform" is only allowed when type is "segment"`,
        }),
        registration: this.segmentOnly(Joi.string().valid(...Object.values(eNotificationRegistrationFilter))).messages({
            "any.only": `"audience.registration" must be one of [${Object.values(eNotificationRegistrationFilter).join(", ")}]`,
            "any.unknown": `"audience.registration" is only allowed when type is "segment"`,
        }),
        appVersions: this.segmentOnly(Joi.array().items(Joi.string().trim().max(30)).min(1).max(20).unique()).messages({
            "any.unknown": `"audience.appVersions" is only allowed when type is "segment"`,
        }),
    })
        .required()
        .messages({ "any.required": `"audience" is a required field` });

    public audienceCountSchema = Joi.object<iAudienceCountPayload>({
        audience: this.audience,
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public sendSchema = Joi.object<iSendNotificationPayload>({
        ...this.contentKeys(true),
        audience: this.audience,
        scheduledAt: Joi.date().iso().messages({
            "date.base": `"scheduledAt" must be a valid ISO date`,
            "date.format": `"scheduledAt" must be a valid ISO date`,
        }),
        idempotencyKey: Joi.string().trim().min(8).max(64).messages({
            "string.min": `"idempotencyKey" must be at least {#limit} characters`,
            "string.max": `"idempotencyKey" must be at most {#limit} characters`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public sendTestSchema = Joi.object<iSendTestNotificationPayload>(this.contentKeys(true))
        .options({ convert: true, abortEarly: true, allowUnknown: false });

    public listQuerySchema = Joi.object<iNotificationListQuery & { enc?: string }>({
        page: Joi.number().integer().min(1).default(1).messages({
            "number.base": `"page" must be a number`,
            "number.min": `"page" must be at least 1`,
        }),
        limit: Joi.number().integer().min(1).max(50).default(15).messages({
            "number.base": `"limit" must be a number`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 50`,
        }),
        status: Joi.string().valid(...Object.values(eNotificationCampaignStatus)).messages({
            "any.only": `"status" must be one of [${Object.values(eNotificationCampaignStatus).join(", ")}]`,
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

    public templateCreateSchema = Joi.object<iTemplatePayload>({
        name: Joi.string().trim().min(2).max(80).required().messages({
            "string.empty": `"name" cannot be empty`,
            "string.min": `"name" must be at least {#limit} characters`,
            "string.max": `"name" must be at most {#limit} characters`,
            "any.required": `"name" is a required field`,
        }),
        ...this.contentKeys(true),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public templateUpdateSchema = Joi.object<iUpdateTemplatePayload>({
        name: Joi.string().trim().min(2).max(80).messages({
            "string.empty": `"name" cannot be empty`,
            "string.min": `"name" must be at least {#limit} characters`,
            "string.max": `"name" must be at most {#limit} characters`,
        }),
        ...this.contentKeys(false),
    })
        .min(1)
        .messages({ "object.min": "At least one field is required" })
        .options({ convert: true, abortEarly: true, allowUnknown: false });
}
