import Joi from "joi";
import { eAdminType } from "../enums/admin.enum";
import { iAddAdminPayload } from "../interfaces/adminPayload.interface";

export default class AdminValidator {
    public static instance: AdminValidator = new AdminValidator();
    private constructor() {}

    public addAdminSchema = Joi.object<iAddAdminPayload>({
        emailId: Joi.string().trim().email().required().messages({
            "string.base": `"emailId" should be a type of 'text'`,
            "string.empty": `"emailId" cannot be empty`,
            "string.email": `"emailId" must be a valid email address`,
            "any.required": `"emailId" is a required field`,
        }),
        password: Joi.string().trim().min(6).default("Admin@123").messages({
            "string.base": `"password" should be a type of 'text'`,
            "string.empty": `"password" cannot be empty`,
            "string.min": `"password" must be at least 6 characters`,
        }),
        fullName: Joi.string().trim().required().messages({
            "string.base": `"fullName" should be a type of 'text'`,
            "string.empty": `"fullName" cannot be empty`,
            "any.required": `"fullName" is a required field`,
        }),
        adminType: Joi.string().valid(...Object.values(eAdminType)).required().messages({
            "any.only": `"adminType" must be one of ${Object.values(eAdminType).join(", ")}`,
            "any.required": `"adminType" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
