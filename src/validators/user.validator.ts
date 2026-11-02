import Joi from "joi";
import { iUserListQuery, iUserStatusPayload } from "../interfaces/userList.interface";
import { iWorkoutPlanHistoryQuery } from "../interfaces/workoutPlanHistory.interface";

export default class UserValidator {
    public static instance: UserValidator = new UserValidator();
    private constructor() {}

    public userIdParamSchema = Joi.object<{ id: string }>({
        id: Joi.string().hex().length(24).required().messages({
            "string.hex": `"id" must be a valid user id`,
            "string.length": `"id" must be a valid user id`,
            "any.required": `"id" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public userStatusSchema = Joi.object<iUserStatusPayload>({
        isActive: Joi.boolean().strict().required().messages({
            "boolean.base": `"isActive" must be true or false`,
            "any.required": `"isActive" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public workoutPlanHistoryQuerySchema = Joi.object<iWorkoutPlanHistoryQuery & { enc?: string }>({
        page: Joi.number().integer().min(1).default(1).messages({
            "number.base": `"page" must be a number`,
            "number.min": `"page" must be at least 1`,
        }),
        limit: Joi.number().integer().min(1).max(20).default(10).messages({
            "number.base": `"limit" must be a number`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 20`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public dietPlanHistoryQuerySchema = this.workoutPlanHistoryQuerySchema;

    public userListQuerySchema = Joi.object<iUserListQuery & { enc?: string }>({
        page: Joi.number().integer().min(1).default(1).messages({
            "number.base": `"page" must be a number`,
            "number.min": `"page" must be at least 1`,
        }),
        filter: Joi.string().valid("all", "active", "inactive", "premium").default("all").messages({
            "any.only": `"filter" must be one of all, active, inactive, premium`,
        }),
        search: Joi.string().trim().max(100).optional().allow("").messages({
            "string.max": `"search" cannot exceed 100 characters`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
