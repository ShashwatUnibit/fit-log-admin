import Joi from "joi";
import { iHealthListQuery, iHealthSummaryQuery, iPeriodLogListQuery, iSugarListQuery, iSugarSummaryQuery } from "../interfaces/userHealth.interface";

const DAY_OPTIONS = [7, 30, 90];
const MEAL_CONTEXTS = ["all", "fasting", "before_meal", "after_meal", "random"];
const PAGE_LIMIT_MAX = 50;
const PAGE_LIMIT_DEFAULT = 10;

export default class UserHealthValidator {
    public static instance: UserHealthValidator = new UserHealthValidator();
    private constructor() {}

    private days = Joi.number().valid(...DAY_OPTIONS).messages({
        "any.only": `"days" must be one of [${DAY_OPTIONS.join(", ")}]`,
        "number.base": `"days" must be one of [${DAY_OPTIONS.join(", ")}]`,
    });

    private mealContext = Joi.string().valid(...MEAL_CONTEXTS).default("all").messages({
        "any.only": `"mealContext" must be one of [${MEAL_CONTEXTS.join(", ")}]`,
    });

    private page = Joi.number().integer().min(1).default(1).messages({
        "number.base": `"page" must be a number`,
        "number.min": `"page" must be at least 1`,
    });

    private limit = Joi.number().integer().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT).messages({
        "number.base": `"limit" must be a number`,
        "number.min": `"limit" must be at least 1`,
        "number.max": `"limit" cannot exceed ${PAGE_LIMIT_MAX}`,
    });

    public summaryQuerySchema = Joi.object<iHealthSummaryQuery & { enc?: string }>({
        days: this.days.default(30),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public sugarSummaryQuerySchema = Joi.object<iSugarSummaryQuery & { enc?: string }>({
        days: this.days.default(30),
        mealContext: this.mealContext,
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public listQuerySchema = Joi.object<iHealthListQuery & { enc?: string }>({
        page: this.page,
        limit: this.limit,
        days: this.days,
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public sugarListQuerySchema = Joi.object<iSugarListQuery & { enc?: string }>({
        page: this.page,
        limit: this.limit,
        days: this.days,
        mealContext: this.mealContext,
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public periodLogListQuerySchema = Joi.object<iPeriodLogListQuery & { enc?: string }>({
        page: this.page,
        limit: this.limit,
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public menstrualQuerySchema = Joi.object<{ enc?: string }>({
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
