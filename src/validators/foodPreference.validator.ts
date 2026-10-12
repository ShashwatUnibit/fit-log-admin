import Joi from "joi";
import { eFoodPreferences } from "../enums/foodItems.enum";
import { iCreateFoodPreferencePayload } from "../interfaces/foodPreference.interface";

export default class FoodPreferenceValidator {
    public static instance: FoodPreferenceValidator = new FoodPreferenceValidator();
    private constructor() {}

    public createSchema = Joi.object<iCreateFoodPreferencePayload>({
        title: Joi.string()
            .valid(...Object.values(eFoodPreferences))
            .required()
            .messages({
                "string.base": `"title" should be a type of 'text'`,
                "any.only": `"title" must be one of the enum of eFoodPreferences`,
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
}
