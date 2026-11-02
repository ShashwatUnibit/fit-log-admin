import Joi from "joi";
import { iTelemetryQuery } from "../interfaces/telemetry.interface";
import { iCriticalAlertsQuery } from "../interfaces/alert.interface";
import { iTopGoalsQuery } from "../interfaces/goal.interface";

export default class DashboardValidator {
    public static instance: DashboardValidator = new DashboardValidator();
    private constructor() {}

    public topGoalsQuerySchema = Joi.object<iTopGoalsQuery & { enc?: string }>({
        days: Joi.number().valid(7, 30, 90).default(30).messages({
            "number.base": `"days" must be a number`,
            "any.only": `"days" must be one of 7, 30, 90`,
        }),
        limit: Joi.number().integer().min(1).max(20).default(5).messages({
            "number.base": `"limit" must be a number`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 20`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public criticalAlertsQuerySchema = Joi.object<iCriticalAlertsQuery & { enc?: string }>({
        page: Joi.number().integer().min(1).default(1).messages({
            "number.base": `"page" must be a number`,
            "number.min": `"page" must be at least 1`,
        }),
        severity: Joi.string().valid("all", "critical", "high").default("all").messages({
            "any.only": `"severity" must be one of all, critical, high`,
        }),
        days: Joi.number().integer().min(1).max(30).default(1).messages({
            "number.base": `"days" must be a number`,
            "number.min": `"days" must be at least 1`,
            "number.max": `"days" cannot exceed 30`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public telemetryQuerySchema = Joi.object<iTelemetryQuery & { enc?: string }>({
        range: Joi.number().valid(7, 30, 90).default(7).messages({
            "number.base": `"range" must be a number`,
            "any.only": `"range" must be one of 7, 30, 90`,
        }),
        page: Joi.number().integer().min(1).default(1).messages({
            "number.base": `"page" must be a number`,
            "number.min": `"page" must be at least 1`,
        }),
        limit: Joi.number().integer().min(1).max(90).default(30).messages({
            "number.base": `"limit" must be a number`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 90`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
