import Joi from "joi";

export default class AuthValidator {
    public static instance: AuthValidator = new AuthValidator();
    private constructor() {}

    public loginSchema = Joi.object({
        emailId: Joi.string().trim().email().required().messages({
            "string.base": `"emailId" should be a type of 'text'`,
            "string.empty": `"emailId" cannot be empty`,
            "string.email": `"emailId" must be a valid email address`,
            "any.required": `"emailId" is a required field`,
        }),
        password: Joi.string().trim().required().messages({
            "string.base": `"password" should be a type of 'text'`,
            "string.empty": `"password" cannot be empty`,
            "any.required": `"password" is a required field`,
        }),
        fcmToken: Joi.string().trim().optional().allow(""),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public autoLoginSchema = Joi.object({
        userId: Joi.string().trim().required().messages({
            "string.base": `"userId" should be a type of 'text'`,
            "string.empty": `"userId" cannot be empty`,
            "any.required": `"userId" is a required field`,
        }),
        password: Joi.string().trim().required().messages({
            "string.base": `"password" should be a type of 'text'`,
            "string.empty": `"password" cannot be empty`,
            "any.required": `"password" is a required field`,
        }),
        fcmToken: Joi.string().trim().optional().allow(""),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
