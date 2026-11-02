import type { Request, Response } from "express";
import UserDb from "../db/mongo/users.mongo";
import UserDietPlanDb from "../db/mongo/userDietPlan.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iDietDayView, iDietPlanHistory, iDietPlanHistoryQuery, iDietPlanView } from "../interfaces/dietPlanHistory.interface";
import { iResponse } from "../interfaces/response.interface";
import { iDietDay, iUserDietPlan } from "../interfaces/userDietPlan.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import UserValidator from "../validators/user.validator";

export default class UserDietPlanController {
    public static instance: UserDietPlanController = new UserDietPlanController();
    private constructor() {}

    public async getDietPlanHistory(req: Request, res: Response): Promise<void> {
        const paramsResult = UserValidator.instance.userIdParamSchema.validate(req.params);
        const queryResult = UserValidator.instance.dietPlanHistoryQuerySchema.validate(req.query);
        const validationError = paramsResult.error ?? queryResult.error;
        if (validationError) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: validationError.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const { id } = req.params as { id: string };
            const userExists = await UserDb.exists({ _id: id, isDeleted: { $ne: true } });
            if (!userExists) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "User not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const data = await this.buildHistory({ userId: id, query: queryResult.value as iDietPlanHistoryQuery });
            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Diet plan history fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        } catch (err: unknown) {
            const errorRes = toErrorResponse(err);
            const responseData: iResponse = {
                status: eResponseStatus.FAIL,
                message: errorRes.message ?? "Internal server error",
                httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        }
    }

    /** The user app serves a user's latest plan (by createdAt) as their current one, so that plan is "Active". */
    private async buildHistory(params: { userId: string; query: iDietPlanHistoryQuery }): Promise<iDietPlanHistory> {
        const { userId, query } = params;
        const [totalPlans, latest, plans] = await Promise.all([
            UserDietPlanDb.countDocuments({ userId }),
            UserDietPlanDb.findOne({ userId }).sort({ createdAt: -1, _id: -1 }).select("_id").lean(),
            UserDietPlanDb.find({ userId })
                .sort({ createdAt: -1, _id: -1 })
                .skip((query.page - 1) * query.limit)
                .limit(query.limit)
                .lean(),
        ]);
        const activeId = latest ? String(latest._id) : null;

        return {
            summary: { totalPlans, activePlans: activeId ? 1 : 0 },
            plans: plans.map((plan) => this.toPlanView({ plan, isActive: String(plan._id) === activeId })),
            pagination: { page: query.page, limit: query.limit, totalItems: totalPlans, totalPages: Math.ceil(totalPlans / query.limit) },
        };
    }

    private toPlanView(params: { plan: iUserDietPlan; isActive: boolean }): iDietPlanView {
        const { plan, isActive } = params;
        const restrictions = plan.dietaryRestrictions ?? [];
        const days = [...(plan.weeklyPlan ?? [])].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));
        return {
            dietPlanId: String(plan._id),
            userId: String(plan.userId),
            // The plan has no stored name; it is labelled by food preference plus the first dietary restriction.
            name: [plan.foodPreferences, restrictions[0]].filter(Boolean).join(" · ") || "Diet plan",
            foodPreference: plan.foodPreferences ?? null,
            isActive,
            status: isActive ? "Active" : "Inactive",
            avgCalories: plan.avgCalories ?? null,
            protein: plan.protein ?? null,
            daysCount: plan.daysCount ?? null,
            startDate: plan.startDate ?? null,
            endDate: plan.endDate ?? null,
            allergies: plan.foodAllergies ?? [],
            intolerances: plan.foodIntolerances ?? [],
            restrictions,
            nutritionTips: plan.nutritionTips ?? [],
            createdAt: plan.createdAt ?? null,
            weeklyPlan: days.map((day) => this.toDayView(day)),
        };
    }

    private toDayView(day: iDietDay): iDietDayView {
        return {
            dayNumber: day.dayNumber ?? 0,
            dayName: day.dayName ?? null,
            totalCalories: day.totalCalories ?? 0,
            meals: (day.meals ?? []).map((meal) => ({
                name: meal.name ?? null,
                calories: meal.calories ?? 0,
                items: (meal.items ?? []).map((item) => ({ name: item.name ?? null, portionSize: item.portionSize ?? null })),
            })),
        };
    }
}
