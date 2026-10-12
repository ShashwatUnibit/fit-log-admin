import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import ExerciseValidator from "../validators/exercise.validator";
import { iCreateExercisePayload, iGetExercisesQuery } from "../interfaces/exercise.interface";
import ExerciseDb from "../db/mongo/exercise.mongo";
import GeminiService from "../services/gemini.service";
import { eFocusPart } from "../enums/exercise.enum";

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

            // Generate exerciseType, equipmentRequired, description, and level metrics using Gemini AI
            const { exerciseType, equipmentRequired, description: aiDescription, levels } = await GeminiService.instance.generateExerciseMetrics(
                payload.name.trim(),
                payload.focusPart
            );

            const description = payload.description && payload.description.trim().length > 0
                ? payload.description.trim()
                : aiDescription;

            const newExercise = new ExerciseDb({
                name: payload.name.trim(),
                description,
                focusPart: payload.focusPart,
                exerciseType,
                equipmentRequired,
                imageUrl: payload.imageUrl ? payload.imageUrl.trim() : "",
                levels,
            });

            const exercise = await newExercise.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Exercise created successfully",
                httpCode: eHttpStatusCode.OK,
                data: exercise,
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
            const { focusPart, exerciseType, exerciseLevel, page, limit } = value as iGetExercisesQuery;

            const filterQuery: Record<string, unknown> = { isDeleted: false };
            // If focusPart is "Full Body", include all exercises across focus parts
            if (focusPart && focusPart !== eFocusPart.FULL_BODY) {
                filterQuery.focusPart = focusPart;
            }
            if (exerciseType) {
                filterQuery.exerciseType = exerciseType;
            }
            if (exerciseLevel) {
                filterQuery["levels.level"] = exerciseLevel;
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
                if (exerciseLevel) {
                    const matchedLevel = exercise.levels.find(
                        (l) => l.level.toLowerCase() === exerciseLevel.toLowerCase()
                    );
                    const { levels: _unused, ...rest } = exercise;
                    return {
                        ...rest,
                        selectedLevel: matchedLevel,
                    };
                }

                return exercise;
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
}
