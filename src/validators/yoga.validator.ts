import Joi from "joi";
import { iCreateYogaPayload, iGetYogasQuery } from "../interfaces/yoga.interface";

export default class YogaValidator {
    public static instance: YogaValidator = new YogaValidator();
    private constructor() { }

    public createSchema = Joi.object<iCreateYogaPayload>({
        englishName: Joi.string().trim().min(1).optional().messages({
            "string.base": `"englishName" should be a type of 'text'`,
            "string.empty": `"englishName" cannot be empty`,
            "string.min": `"englishName" must have at least 1 character`,
        }),
        sanskritName: Joi.string().trim().min(1).optional().messages({
            "string.base": `"sanskritName" should be a type of 'text'`,
            "string.empty": `"sanskritName" cannot be empty`,
            "string.min": `"sanskritName" must have at least 1 character`,
        }),
        imageUrl: Joi.string().trim().optional().allow(""),
        videoUrl: Joi.string().trim().optional().allow(""),
        isActive: Joi.boolean().optional(),
    })
        .or("englishName", "sanskritName")
        .messages({
            "object.missing": "At least one of 'englishName' or 'sanskritName' must be provided",
        })
        .options({ convert: true, abortEarly: true, allowUnknown: false });

    public getYogasQuerySchema = Joi.object<iGetYogasQuery>({
        search: Joi.string().trim().optional().allow(""),
        page: Joi.number().integer().min(1).optional().messages({
            "number.base": `"page" should be a type of 'number'`,
            "number.min": `"page" must be at least 1`,
        }),
        limit: Joi.number().integer().min(1).max(100).optional().messages({
            "number.base": `"limit" should be a type of 'number'`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 100`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: true, stripUnknown: true });
}
