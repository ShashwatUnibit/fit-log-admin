import Joi from "joi";
import { eBannerType, eRedirectType } from "../enums/banner.enum";
import {
    iBannerListQuery,
    iCreateBannerPayload,
    iUpdateBannerOrderPayload,
    iUpdateBannerStatusPayload,
} from "../interfaces/banner.interface";

export default class BannerValidator {
    public static instance: BannerValidator = new BannerValidator();
    private constructor() {}

    private readonly bannerId = Joi.string().trim().length(24).hex().required().messages({
        "string.base": `"bannerId" should be a type of 'text'`,
        "string.empty": `"bannerId" cannot be empty`,
        "string.length": `"bannerId" must be a valid id`,
        "string.hex": `"bannerId" must be a valid id`,
        "any.required": `"bannerId" is a required field`,
    });

    public createSchema = Joi.object<iCreateBannerPayload>({
        imageUrl: Joi.string().trim().uri().required().messages({
            "string.base": `"imageUrl" should be a type of 'text'`,
            "string.empty": `"imageUrl" cannot be empty`,
            "string.uri": `"imageUrl" must be a valid URL`,
            "any.required": `"imageUrl" is a required field`,
        }),
        redirectType: Joi.string()
            .trim()
            .valid(...Object.values(eRedirectType))
            .optional()
            .empty("")
            .allow(null)
            .messages({
                "string.base": `"redirectType" should be a type of 'text'`,
                "any.only": `"redirectType" must be one of [${Object.values(eRedirectType).join(", ")}]`,
            }),
        redirectValue: Joi.string().trim().optional().empty("").allow(null).messages({
            "string.base": `"redirectValue" should be a type of 'text'`,
        }),
        bannerType: Joi.string()
            .trim()
            .valid(...Object.values(eBannerType))
            .optional()
            .empty("")
            .allow(null)
            .messages({
                "string.base": `"bannerType" should be a type of 'text'`,
                "any.only": `"bannerType" must be one of [${Object.values(eBannerType).join(", ")}]`,
            }),
        orderData: Joi.number().integer().min(1).optional().messages({
            "number.base": `"orderData" should be a type of 'number'`,
            "number.integer": `"orderData" must be an integer`,
            "number.min": `"orderData" should be greater than or equal to {#limit}`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public idParamSchema = Joi.object<{ id: string }>({
        id: Joi.string().trim().length(24).hex().required().messages({
            "string.length": `"id" must be a valid id`,
            "string.hex": `"id" must be a valid id`,
            "any.required": `"id" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public listQuerySchema = Joi.object<iBannerListQuery & { enc?: string }>({
        isActive: Joi.boolean().messages({
            "boolean.base": `"isActive" must be true or false`,
        }),
        bannerType: Joi.string()
            .trim()
            .valid(...Object.values(eBannerType))
            .messages({
                "any.only": `"bannerType" must be one of [${Object.values(eBannerType).join(", ")}]`,
            }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updateStatusSchema = Joi.object<iUpdateBannerStatusPayload>({
        bannerId: this.bannerId,
        isActive: Joi.boolean().strict().required().messages({
            "boolean.base": `"isActive" must be true or false`,
            "any.required": `"isActive" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updateOrderSchema = Joi.object<iUpdateBannerOrderPayload>({
        bannerId: this.bannerId,
        orderData: Joi.number().integer().min(1).required().messages({
            "number.base": `"orderData" should be a type of 'number'`,
            "number.integer": `"orderData" must be an integer`,
            "number.min": `"orderData" should be greater than or equal to {#limit}`,
            "any.required": `"orderData" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
