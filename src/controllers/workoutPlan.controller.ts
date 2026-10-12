import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import WorkoutPlanValidator from "../validators/workoutPlan.validator";
import { iCreateWorkoutPlanPayload, iWorkoutPlanExercise } from "../interfaces/workoutPlan.interface";
import WorkoutPlanDb from "../db/mongo/workoutPlan.mongo";
import { eExerciseLevel, eFocusPart } from "../enums/exercise.enum";
import mongoose from "mongoose";

export default class WorkoutPlanController {
    public static instance: WorkoutPlanController = new WorkoutPlanController();
    private constructor() { }

    public async createWorkoutPlan(req: Request, res: Response): Promise<void> {
        const { error } = WorkoutPlanValidator.instance.createSchema.validate(req.body || {});
        if (error) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: error.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const payload = req.body as iCreateWorkoutPlanPayload;
            const existingPlan = await WorkoutPlanDb.findOne({
                name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
                isDeleted: false,
            });

            if (existingPlan) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Workout plan with this name already exists",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const existingPlanForExerciseFor = await WorkoutPlanDb.findOne({
                exerciseFor: payload.exerciseFor,
                isDeleted: false,
            });

            if (existingPlanForExerciseFor) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: `A workout plan for '${payload.exerciseFor}' already exists ('${existingPlanForExerciseFor.name}'). Only one workout plan is allowed per exerciseFor.`,
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            // Validate focusPart consistency based on exerciseFor
            if (payload.exerciseFor !== eFocusPart.FULL_BODY) {
                const mismatchedExercise = payload.exercises.find(
                    (e) => e.focusPart !== payload.exerciseFor
                );
                if (mismatchedExercise) {
                    const responseData: iResponse = {
                        status: eResponseStatus.ERROR,
                        message: `All exercises must have focusPart '${payload.exerciseFor}'. Found '${mismatchedExercise.name}' with focusPart '${mismatchedExercise.focusPart}'. Only 'Full Body' workout plans can include mixed focus parts.`,
                        httpCode: eHttpStatusCode.BAD_REQUEST,
                    };
                    EncryptionSecurity.instance.onResponse(req, res, responseData);
                    return;
                }
            }

            // Derive focus parts and overall level
            const uniqueFocusParts = Array.from(
                new Set(payload.exercises.map((e) => e.focusPart))
            ) as eFocusPart[];

            const planLevel: eExerciseLevel =
                payload.level ||
                (payload.exercises[0]?.selectedLevel?.level as eExerciseLevel) ||
                eExerciseLevel.BEGINNER;

            // Generate subtitle e.g. "Chest & Back"
            const subtitle = uniqueFocusParts.slice(0, 2).join(" & ");

            // Calculate total duration and calories
            let totalDuration = 0;
            let totalCaloriesBurn = 0;

            const mappedExercises: iWorkoutPlanExercise[] = payload.exercises.map((item) => {
                const sets = item.selectedLevel.sets;
                const durationPerSet = item.selectedLevel.durationPerSet;
                const workTime = sets * durationPerSet;

                totalDuration += item.selectedLevel.totalTimeToComplete;
                totalCaloriesBurn += item.selectedLevel.caloriesBurn;

                const exerciseId = item._id || item.exerciseId;

                return {
                    exerciseId: exerciseId && mongoose.Types.ObjectId.isValid(exerciseId)
                        ? new mongoose.Types.ObjectId(exerciseId)
                        : undefined,
                    name: item.name.trim(),
                    description: item.description ? item.description.trim() : "",
                    focusPart: item.focusPart,
                    exerciseType: item.exerciseType,
                    equipmentRequired: item.equipmentRequired ? item.equipmentRequired.trim() : "None",
                    imageUrl: item.imageUrl ? item.imageUrl.trim() : "",
                    selectedLevel: item.selectedLevel,
                    workTime,
                    note: item.note ? item.note.trim() : "",
                };
            });

            const newWorkoutPlan = new WorkoutPlanDb({
                name: payload.name.trim(),
                subtitle,
                description: payload.description.trim(),
                exerciseFor: payload.exerciseFor,
                level: planLevel,
                focusParts: uniqueFocusParts,
                totalExercises: mappedExercises.length,
                totalDuration,
                totalCaloriesBurn,
                exercises: mappedExercises,
                isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,
            });

            const workoutPlan = await newWorkoutPlan.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Workout plan created successfully",
                httpCode: eHttpStatusCode.OK,
                data: workoutPlan,
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

    public async getWorkoutPlans(req: Request, res: Response): Promise<void> {
        try {
            const { level, isActive, exerciseFor } = req.query;
            const filterQuery: Record<string, unknown> = { isDeleted: false };

            if (exerciseFor && typeof exerciseFor === "string") {
                filterQuery.exerciseFor = exerciseFor;
            }
            if (level && typeof level === "string") {
                filterQuery.level = level;
            }
            if (typeof isActive === "string") {
                filterQuery.isActive = isActive === "true";
            }

            const workoutPlans = await WorkoutPlanDb.find(filterQuery)
                .sort({ createdAt: -1 })
                .lean();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Workout plans fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: workoutPlans,
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

    public async getWorkoutPlanById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Invalid workout plan ID",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const workoutPlan = await WorkoutPlanDb.findOne({ _id: id, isDeleted: false }).lean();
            if (!workoutPlan) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Workout plan not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Workout plan fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: workoutPlan,
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

    public async toggleWorkoutPlanStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Invalid workout plan ID",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const workoutPlan = await WorkoutPlanDb.findOne({ _id: id, isDeleted: false });
            if (!workoutPlan) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Workout plan not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            workoutPlan.isActive = !workoutPlan.isActive;
            await workoutPlan.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: `Workout plan ${workoutPlan.isActive ? "activated" : "deactivated"} successfully`,
                httpCode: eHttpStatusCode.OK,
                data: workoutPlan,
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

    public async deleteWorkoutPlan(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Invalid workout plan ID",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const workoutPlan = await WorkoutPlanDb.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true } },
                { new: true }
            );

            if (!workoutPlan) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Workout plan not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Workout plan deleted successfully",
                httpCode: eHttpStatusCode.OK,
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

    public async getWorkoutPlanByExerciseFor(req: Request, res: Response): Promise<void> {
        try {
            const rawExerciseFor = req.params.exerciseFor;
            if (
                !rawExerciseFor ||
                typeof rawExerciseFor !== "string" ||
                !Object.values(eFocusPart).includes(rawExerciseFor as eFocusPart)
            ) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: `Invalid or missing exerciseFor parameter. Allowed values: ${Object.values(eFocusPart).join(", ")}`,
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const exerciseFor = rawExerciseFor as eFocusPart;

            const workoutPlan = await WorkoutPlanDb.findOne({
                exerciseFor,
                isDeleted: false,
            }).lean();

            if (!workoutPlan) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: `No workout plan found for '${exerciseFor}'`,
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Workout plan fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: workoutPlan,
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
}
