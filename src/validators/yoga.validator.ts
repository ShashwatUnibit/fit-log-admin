import Joi from "joi";
import { iCreateYogaPayload, iGetYogasQuery, iUpdateYogaPayload } from "../interfaces/yoga.interface";

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

    public idParamSchema = Joi.object<{ id: string }>({
        id: Joi.string().trim().length(24).hex().required().messages({
            "string.length": `"id" must be a valid id`,
            "string.hex": `"id" must be a valid id`,
            "any.required": `"id" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updateSchema = Joi.object<iUpdateYogaPayload>({
        englishName: Joi.string().trim().min(1).messages({
            "string.base": `"englishName" should be a type of 'text'`,
            "string.empty": `"englishName" cannot be empty`,
        }),
        sanskritName: Joi.string().trim().min(1).messages({
            "string.base": `"sanskritName" should be a type of 'text'`,
            "string.empty": `"sanskritName" cannot be empty`,
        }),
        sanskritNamePhonetic: Joi.string().trim().allow(""),
        description: Joi.string().trim().allow(""),
        benefits: Joi.array().items(Joi.string().trim().min(1)),
        instructions: Joi.array().items(
            Joi.object({
                stepNumber: Joi.number().integer().min(1).optional(),
                instruction: Joi.string().trim().required(),
                breathCue: Joi.string().trim().optional().allow(""),
            })
        ),
        defaultHoldDurationSeconds: Joi.number().min(0).messages({
            "number.base": `"defaultHoldDurationSeconds" should be a type of 'number'`,
        }),
        recommendedRepitition: Joi.number().integer().min(1).messages({
            "number.base": `"recommendedRepitition" should be a type of 'number'`,
        }),
        timeTakenPerRepetition: Joi.number().min(0).messages({
            "number.base": `"timeTakenPerRepetition" should be a type of 'number'`,
        }),
        totalTimeTaken: Joi.number().min(0).messages({
            "number.base": `"totalTimeTaken" should be a type of 'number'`,
        }),
        propsRequired: Joi.array().items(Joi.string().trim().min(1)),
        breathingGuidance: Joi.string().trim().allow(""),
        imageUrl: Joi.string().trim().allow(""),
        videoUrl: Joi.string().trim().allow(""),
        isActive: Joi.boolean().messages({ "boolean.base": `"isActive" must be true or false` }),
    })
        .min(1)
        .messages({ "object.min": "At least one field to update is required" })
        .options({ convert: true, abortEarly: true, allowUnknown: false });

    public getYogasQuerySchema = Joi.object<iGetYogasQuery>({
        search: Joi.string().trim().max(100).optional().allow("").messages({
            "string.base": `"search" should be a type of 'text'`,
            "string.max": `"search" should have a maximum length of {#limit}`,
        }),
        isActive: Joi.boolean().optional().messages({
            "boolean.base": `"isActive" must be true or false`,
        }),
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
