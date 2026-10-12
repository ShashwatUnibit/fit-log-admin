import type { Request, Response } from "express";
import mongoose from "mongoose";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import ExerciseValidator from "../validators/exercise.validator";
import { iCreateExercisePayload, iGetExercisesQuery } from "../interfaces/exercise.interface";
import ExerciseDb from "../db/mongo/exercise.mongo";
import GeminiService from "../services/gemini.service";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";

export default class ExerciseController {
    public static instance: ExerciseController = new ExerciseController();
    private constructor() { }

    public async createExercise(req: Request, res: Response): Promise<void> {
        const { error } = ExerciseValidator.instance.createSchema.validate(req.body || {});
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
            const payload = req.body as iCreateExercisePayload;
            const existingExercise = await ExerciseDb.findOne({ name: payload.name.trim(), isDeleted: false });
            if (existingExercise) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Exercise with this name already exists",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            // Check if AI generation is needed for unspecified add-ons
            const needsAiMetrics =
                !payload.levels ||
                payload.levels.length === 0 ||
                !payload.healthProfilePrecaution ||
                !payload.targetMuscles ||
                !payload.stepByStepInstructions ||
                payload.stepByStepInstructions.length === 0;

            const aiMetrics = needsAiMetrics
                ? await GeminiService.instance.generateExerciseMetrics(payload.name.trim(), payload.focusPart)
                : null;

            const exerciseType = payload.exerciseType || aiMetrics?.exerciseType || eExerciseType.STRENGTH;
            const equipmentRequired = payload.equipmentRequired && payload.equipmentRequired.trim().length > 0
                ? payload.equipmentRequired.trim()
                : (aiMetrics?.equipmentRequired || "None (Bodyweight)");

            const description = payload.description && payload.description.trim().length > 0
                ? payload.description.trim()
                : (aiMetrics?.description || "");

            const levels = payload.levels && payload.levels.length > 0
                ? payload.levels
                : (aiMetrics?.levels || []);

            const healthProfilePrecaution = payload.healthProfilePrecaution || aiMetrics?.healthProfilePrecaution;
            const targetMuscles = payload.targetMuscles || aiMetrics?.targetMuscles;
            const stepByStepInstructions = payload.stepByStepInstructions && payload.stepByStepInstructions.length > 0
                ? payload.stepByStepInstructions
                : (aiMetrics?.stepByStepInstructions || []);
            const commonMistakesAndCorrections = payload.commonMistakesAndCorrections && payload.commonMistakesAndCorrections.length > 0
                ? payload.commonMistakesAndCorrections
                : (aiMetrics?.commonMistakesAndCorrections || []);
            const breathingPattern = payload.breathingPattern && payload.breathingPattern.trim().length > 0
                ? payload.breathingPattern.trim()
                : (aiMetrics?.breathingPattern || "");

            const imageUrl = payload.imageUrl?.trim() || payload.image?.trim() || "";
            const videoUrl = payload.videoUrl?.trim() || payload.video?.trim() || "";

            const newExercise = new ExerciseDb({
                name: payload.name.trim(),
                description,
                focusPart: payload.focusPart,
                exerciseType,
                equipmentRequired,
                imageUrl,
                image: imageUrl,
                videoUrl,
                video: videoUrl,
                healthProfilePrecaution,
                targetMuscles,
                stepByStepInstructions,
                commonMistakesAndCorrections,
                breathingPattern,
                levels,
            });

            const exercise = await newExercise.save();
            const exerciseObj = exercise.toObject ? exercise.toObject() : exercise;

            const responsePayload = {
                id: exerciseObj._id,
                ...exerciseObj,
                image: exerciseObj.imageUrl || exerciseObj.image || "",
                video: exerciseObj.videoUrl || exerciseObj.video || "",
            };

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Exercise created successfully",
                httpCode: eHttpStatusCode.OK,
                data: responsePayload,
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

    public async getExercises(req: Request, res: Response): Promise<void> {
        const { error, value } = ExerciseValidator.instance.getExercisesQuerySchema.validate(req.query || {});
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
            const { focusPart, exerciseType, exerciseLevel, level, equipmentRequired, totalTimeToComplete, page, limit } =
                value as iGetExercisesQuery;

            const filterQuery: Record<string, unknown> = { isDeleted: false };
            // If focusPart is "Full Body", include all exercises across focus parts
            if (focusPart && focusPart !== eFocusPart.FULL_BODY) {
                filterQuery.focusPart = focusPart;
            }
            if (exerciseType) {
                filterQuery.exerciseType = exerciseType;
            }

            const targetLevel = (level || exerciseLevel) as eExerciseLevel | undefined;
            if (targetLevel) {
                filterQuery["levels.level"] = targetLevel;
            }

            if (equipmentRequired && typeof equipmentRequired === "string" && equipmentRequired.trim().length > 0) {
                filterQuery.equipmentRequired = { $regex: new RegExp(equipmentRequired.trim(), "i") };
            }

            if (totalTimeToComplete && !isNaN(Number(totalTimeToComplete))) {
                filterQuery["levels.totalTimeToComplete"] = { $lte: Number(totalTimeToComplete) };
            }

            const isPaginated = page !== undefined || limit !== undefined;
            const pageNum = Math.max(1, Number(page) || 1);
            const limitNum = Math.max(1, Number(limit) || 10);
            const skip = (pageNum - 1) * limitNum;

            const total = await ExerciseDb.countDocuments(filterQuery);

            let query = ExerciseDb.find(filterQuery).sort({ createdAt: -1 });
            if (isPaginated) {
                query = query.skip(skip).limit(limitNum);
            }

            const exercises = await query.lean();

            const formattedExercises = exercises.map((exercise) => {
                const id = exercise._id;
                const image = exercise.imageUrl || exercise.image || "";
                const video = exercise.videoUrl || exercise.video || "";

                if (targetLevel) {
                    const matchedLevel = exercise.levels.find(
                        (l) => l.level.toLowerCase() === targetLevel.toLowerCase()
                    ) || exercise.levels[0];

                    return {
                        id,
                        ...exercise,
                        image,
                        video,
                        selectedLevel: matchedLevel,
                        level: matchedLevel?.level,
                        sets: matchedLevel?.sets,
                        repetitions: matchedLevel?.repetition,
                        repetition: matchedLevel?.repetition,
                        restTime: matchedLevel?.restTime,
                        caloriesBurn: matchedLevel?.caloriesBurn,
                        durationPerSet: matchedLevel?.durationPerSet,
                        totalTimeToComplete: matchedLevel?.totalTimeToComplete,
                    };
                }

                return {
                    id,
                    ...exercise,
                    image,
                    video,
                };
            });

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Exercises fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: isPaginated
                    ? {
                        exercises: formattedExercises,
                        pagination: {
                            total,
                            page: pageNum,
                            limit: limitNum,
                            totalPages: Math.ceil(total / limitNum),
                            hasNextPage: pageNum < Math.ceil(total / limitNum),
                            hasPrevPage: pageNum > 1,
                        },
                    }
                    : formattedExercises,
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

    public async getExerciseById(req: Request, res: Response): Promise<void> {
        try {
            const rawId = req.params.id;
            const id = Array.isArray(rawId) ? rawId[0] : rawId;
            if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Invalid exercise ID",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const exercise = await ExerciseDb.findOne({ _id: id, isDeleted: false }).lean();
            if (!exercise) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Exercise not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const requestedLevel = (req.query.level || req.query.exerciseLevel) as string | undefined;
            const matchedLevel = requestedLevel
                ? exercise.levels.find((l) => l.level.toLowerCase() === requestedLevel.toLowerCase()) || exercise.levels[0]
                : exercise.levels[0];

            const responsePayload = {
                id: exercise._id,
                ...exercise,
                image: exercise.imageUrl || exercise.image || "",
                video: exercise.videoUrl || exercise.video || "",
                selectedLevel: matchedLevel,
                level: matchedLevel?.level,
                sets: matchedLevel?.sets,
                repetitions: matchedLevel?.repetition,
                repetition: matchedLevel?.repetition,
                restTime: matchedLevel?.restTime,
                caloriesBurn: matchedLevel?.caloriesBurn,
                durationPerSet: matchedLevel?.durationPerSet,
                totalTimeToComplete: matchedLevel?.totalTimeToComplete,
            };

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Exercise fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: responsePayload,
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
