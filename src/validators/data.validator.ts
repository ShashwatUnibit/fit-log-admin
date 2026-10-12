import Joi from "joi";

export default class DataValidator {
    public static instance: DataValidator = new DataValidator();
    private constructor() { }

    public sampleSchema = Joi.object<{
        amount: number;
    }>({
        amount: Joi.number().positive().min(1).required().messages({
            "number.base": `"amount" should be a type of 'number'`,
            "number.positive": `"amount" must be a positive number`,
            "any.required": `"amount" is a required field`,
        }),
    }).options({
        convert: true,
        abortEarly: true,
        allowUnknown: false,
    });
}
