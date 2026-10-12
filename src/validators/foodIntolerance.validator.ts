import Joi from "joi";
import { eFoodIntolerances } from "../enums/foodItems.enum";
import { iCreateFoodIntolerancePayload } from "../interfaces/foodIntolerance.interface";

export default class FoodIntoleranceValidator {
    public static instance: FoodIntoleranceValidator = new FoodIntoleranceValidator();
    private constructor() {}

    public createSchema = Joi.object<iCreateFoodIntolerancePayload>({
        title: Joi.string()
            .valid(...Object.values(eFoodIntolerances))
            .required()
            .messages({
                "string.base": `"title" should be a type of 'text'`,
                "any.only": `"title" must be one of the enum of eFoodIntolerances`,
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
