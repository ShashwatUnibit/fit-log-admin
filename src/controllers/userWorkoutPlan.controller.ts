import type { Request, Response } from "express";
import UserDb from "../db/mongo/users.mongo";
import UserWorkoutPlanDb from "../db/mongo/userWorkoutPlan.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import { iUserWorkoutPlan, iPlanDay, iPlanExercise } from "../interfaces/userWorkoutPlan.interface";
import { iWorkoutDayView, iWorkoutExerciseView, iWorkoutPlanHistory, iWorkoutPlanHistoryQuery, iWorkoutPlanView } from "../interfaces/workoutPlanHistory.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import UserValidator from "../validators/user.validator";

export default class UserWorkoutPlanController {
    public static instance: UserWorkoutPlanController = new UserWorkoutPlanController();
    private constructor() {}

    public async getWorkoutPlanHistory(req: Request, res: Response): Promise<void> {
        const paramsResult = UserValidator.instance.userIdParamSchema.validate(req.params);
        const queryResult = UserValidator.instance.workoutPlanHistoryQuerySchema.validate(req.query);
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

            const data = await this.buildHistory({ userId: id, query: queryResult.value as iWorkoutPlanHistoryQuery });
            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Workout plan history fetched successfully",
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

    private async buildHistory(params: { userId: string; query: iWorkoutPlanHistoryQuery }): Promise<iWorkoutPlanHistory> {
        const { userId, query } = params;
        const filter = { userId, isDeleted: { $ne: true } };
        const [totalPlans, activePlans, plans] = await Promise.all([
            UserWorkoutPlanDb.countDocuments(filter),
            UserWorkoutPlanDb.countDocuments({ ...filter, isActive: true }),
            UserWorkoutPlanDb.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((query.page - 1) * query.limit)
                .limit(query.limit)
                .lean(),
        ]);

        return {
            summary: { totalPlans, activePlans },
            plans: plans.map((plan) => this.toPlanView(plan)),
            pagination: { page: query.page, limit: query.limit, totalItems: totalPlans, totalPages: Math.ceil(totalPlans / query.limit) },
        };
    }

    private toPlanView(plan: iUserWorkoutPlan): iWorkoutPlanView {
        const isActive = plan.isActive === true;
        const days = [...(plan.dailyPlan ?? [])].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));
        return {
            workoutPlanId: String(plan._id),
            userId: String(plan.userId),
            name: plan.name ?? null,
            blockNumber: plan.blockNumber ?? null,
            isActive,
            status: isActive ? "Active" : "Inactive",
            startDate: plan.startDate ?? null,
            endDate: plan.endDate ?? null,
            totalExercises: plan.totalExercises ?? 0,
            totalDuration: plan.totalDuration ?? 0,
            totalCaloriesBurn: plan.totalCaloriesBurn ?? 0,
            daysCount: plan.daysCount ?? null,
            daysPassedInProgram: plan.daysPassedInProgram ?? null,
            daysRemainingInProgram: plan.daysRemainingInProgram ?? null,
            totalProgramDays: plan.totalProgramDays ?? null,
            createdAt: plan.createdAt ?? null,
            dailyPlan: days.map((day) => this.toDayView(day)),
        };
    }

    private toDayView(day: iPlanDay): iWorkoutDayView {
        return {
            dayNumber: day.dayNumber ?? 0,
            dayName: day.dayName ?? null,
            isRestDay: day.isRestDay === true,
            focusArea: day.focusArea ?? null,
            totalDuration: day.totalDuration ?? 0,
            totalCaloriesBurn: day.totalCaloriesBurn ?? 0,
            exercises: (day.exercises ?? []).map((exercise, idx) => this.toExerciseView({ exercise, order: idx + 1 })),
        };
    }

    private toExerciseView(params: { exercise: iPlanExercise; order: number }): iWorkoutExerciseView {
        const { exercise, order } = params;
        const level = exercise.selectedLevel;
        return {
            order,
            exerciseId: exercise.exerciseId ? String(exercise.exerciseId) : null,
            name: exercise.name ?? null,
            focusPart: exercise.focusPart ?? null,
            exerciseType: exercise.exerciseType ?? null,
            equipmentRequired: exercise.equipmentRequired ?? null,
            imageUrl: exercise.imageUrl || null,
            video: exercise.video || null,
            isCompleted: exercise.isCompleted === true,
            level: level?.level ?? null,
            sets: level?.sets ?? null,
            reps: level?.repetition ?? null,
            restTime: level?.restTime ?? null,
            caloriesBurn: level?.caloriesBurn ?? null,
            durationPerSet: level?.durationPerSet ?? null,
            totalTimeToComplete: level?.totalTimeToComplete ?? null,
        };
    }
}
