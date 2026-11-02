import Joi from "joi";
import { iCreateFoodAllergyPayload, iUpdateFoodAllergyPayload } from "../interfaces/foodAllergy.interface";
import { iFoodItemListQuery } from "../interfaces/foodItemList.interface";

export default class FoodAllergyValidator {
    public static instance: FoodAllergyValidator = new FoodAllergyValidator();
    private constructor() {}

    public createSchema = Joi.object<iCreateFoodAllergyPayload>({
        title: Joi.string().trim().min(2).max(100).required().messages({
            "string.base": `"title" should be a type of 'text'`,
            "string.empty": `"title" cannot be empty`,
            "string.min": `"title" should have a minimum length of {#limit}`,
            "string.max": `"title" should have a maximum length of {#limit}`,
            "any.required": `"title" is a required field`,
        }),
        subtitle: Joi.string().trim().required().messages({
            "string.base": `"subtitle" should be a type of 'text'`,
            "string.empty": `"subtitle" cannot be empty`,
            "any.required": `"subtitle" is a required field`,
        }),
        imageUrl: Joi.string().trim().required().messages({
            "string.base": `"imageUrl" should be a type of 'text'`,
            "string.empty": `"imageUrl" cannot be empty`,
            "any.required": `"imageUrl" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public listQuerySchema = Joi.object<iFoodItemListQuery & { enc?: string }>({
        page: Joi.number().integer().min(1).default(1).messages({
            "number.base": `"page" must be a number`,
            "number.min": `"page" must be at least 1`,
        }),
        limit: Joi.number().integer().min(1).max(50).default(15).messages({
            "number.base": `"limit" must be a number`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 50`,
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

    public updateSchema = Joi.object<iUpdateFoodAllergyPayload>({
        title: Joi.string().trim().min(2).max(100).messages({
            "string.base": `"title" should be a type of 'text'`,
            "string.empty": `"title" cannot be empty`,
            "string.min": `"title" should have a minimum length of {#limit}`,
            "string.max": `"title" should have a maximum length of {#limit}`,
        }),
        subtitle: Joi.string().trim().messages({
            "string.base": `"subtitle" should be a type of 'text'`,
            "string.empty": `"subtitle" cannot be empty`,
        }),
        imageUrl: Joi.string().trim().messages({
            "string.base": `"imageUrl" should be a type of 'text'`,
            "string.empty": `"imageUrl" cannot be empty`,
        }),
    })
        .min(1)
        .messages({ "object.min": "At least one of title, subtitle or imageUrl is required" })
        .options({ convert: true, abortEarly: true, allowUnknown: false });
}
