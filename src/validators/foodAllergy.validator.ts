import Joi from "joi";
import { eFoodAllergies } from "../enums/foodItems.enum";
import { iCreateFoodAllergyPayload } from "../interfaces/foodAllergy.interface";

export default class FoodAllergyValidator {
    public static instance: FoodAllergyValidator = new FoodAllergyValidator();
    private constructor() {}

    public createSchema = Joi.object<iCreateFoodAllergyPayload>({
        title: Joi.string()
            .valid(...Object.values(eFoodAllergies))
            .required()
            .messages({
                "string.base": `"title" should be a type of 'text'`,
                "any.only": `"title" must be one of the enum of eFoodAllergies`,
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
