import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import YogaValidator from "../validators/yoga.validator";
import { iCreateYogaPayload, iGetYogasQuery, iUpdateYogaPayload } from "../interfaces/yoga.interface";
import YogaDb from "../db/mongo/yoga.mongo";
import GeminiService from "../services/gemini.service";

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default class YogaController {
    public static instance: YogaController = new YogaController();
    private constructor() { }

    public async createYoga(req: Request, res: Response): Promise<void> {
        const { error } = YogaValidator.instance.createSchema.validate(req.body || {});
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
            const payload = req.body as iCreateYogaPayload;
            const englishName = payload.englishName?.trim();
            const sanskritName = payload.sanskritName?.trim();

            // Duplicate check: ensure no active yoga pose has either this english or sanskrit name
            const orFilters: Record<string, unknown>[] = [];
            if (englishName) {
                orFilters.push({ englishName: { $regex: new RegExp(`^${escapeRegex(englishName)}$`, "i") } });
            }
            if (sanskritName) {
                orFilters.push({ sanskritName: { $regex: new RegExp(`^${escapeRegex(sanskritName)}$`, "i") } });
            }

            const existingYoga = await YogaDb.findOne({
                isDeleted: false,
                $or: orFilters,
            });

            if (existingYoga) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Yoga pose with this English or Sanskrit name already exists",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            // Generate complete yoga posture profile using Gemini AI
            const aiYoga = await GeminiService.instance.generateYogaDetails({
                englishName,
                sanskritName,
            });

            const newYoga = new YogaDb({
                englishName: englishName || aiYoga.englishName,
                sanskritName: sanskritName || aiYoga.sanskritName,
                sanskritNamePhonetic: aiYoga.sanskritNamePhonetic,
                description: aiYoga.description,
                benefits: aiYoga.benefits,
                instructions: aiYoga.instructions,
                defaultHoldDurationSeconds: aiYoga.defaultHoldDurationSeconds,
                recommendedRepitition: aiYoga.recommendedRepitition,
                timeTakenPerRepetition: aiYoga.timeTakenPerRepetition,
                totalTimeTaken: aiYoga.totalTimeTaken,
                propsRequired: aiYoga.propsRequired,
                breathingGuidance: aiYoga.breathingGuidance,
                imageUrl: payload.imageUrl ? payload.imageUrl.trim() : "",
                videoUrl: payload.videoUrl ? payload.videoUrl.trim() : "",
                isActive: payload.isActive !== undefined ? payload.isActive : true,
                isDeleted: false,
            });

            const yoga = await newYoga.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Yoga pose created successfully",
                httpCode: eHttpStatusCode.OK,
                data: yoga,
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

    public async getYogas(req: Request, res: Response): Promise<void> {
        const { error, value } = YogaValidator.instance.getYogasQuerySchema.validate(req.query || {});
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
            const { search, isActive, page = 1, limit = 20 } = value as iGetYogasQuery;
            const filterQuery: Record<string, unknown> = { isDeleted: false };

            if (isActive !== undefined) {
                filterQuery.isActive = isActive;
            }

            if (search && search.trim().length > 0) {
                const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
                filterQuery.$or = [
                    { englishName: searchRegex },
                    { sanskritName: searchRegex },
                    { sanskritNamePhonetic: searchRegex },
                    { propsRequired: searchRegex },
                    { benefits: searchRegex },
                ];
            }

            const skip = (page - 1) * limit;
            const [items, total] = await Promise.all([
                YogaDb.find(filterQuery)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                YogaDb.countDocuments(filterQuery),
            ]);

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Yoga list retrieved successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    items,
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
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

    public async getYogaById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const yoga = await YogaDb.findOne({ _id: id, isDeleted: false });
            if (!yoga) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Yoga pose not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Yoga pose retrieved successfully",
                httpCode: eHttpStatusCode.OK,
                data: yoga,
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

    public async updateYoga(req: Request, res: Response): Promise<void> {
        const paramsResult = YogaValidator.instance.idParamSchema.validate(req.params);
        const bodyResult = YogaValidator.instance.updateSchema.validate(req.body ?? {});
        const validationError = paramsResult.error ?? bodyResult.error;
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
            const payload = bodyResult.value as iUpdateYogaPayload;
            const changes: Record<string, unknown> = { ...payload };
            if (payload.instructions) {
                changes.instructions = payload.instructions.map((step, index) => ({
                    ...step,
                    stepNumber: step.stepNumber ?? index + 1,
                }));
            }

            const yoga = await YogaDb.findOne({ _id: id, isDeleted: false });
            if (!yoga) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Yoga pose not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const nameFilters: Record<string, unknown>[] = [];
            if (payload.englishName) {
                nameFilters.push({ englishName: new RegExp(`^${escapeRegex(payload.englishName)}$`, "i") });
            }
            if (payload.sanskritName) {
                nameFilters.push({ sanskritName: new RegExp(`^${escapeRegex(payload.sanskritName)}$`, "i") });
            }
            if (nameFilters.length > 0) {
                const duplicate = await YogaDb.exists({ isDeleted: false, _id: { $ne: id }, $or: nameFilters });
                if (duplicate) {
                    const responseData: iResponse = {
                        status: eResponseStatus.ERROR,
                        message: "Yoga pose with this English or Sanskrit name already exists",
                        httpCode: eHttpStatusCode.CONFLICT,
                    };
                    EncryptionSecurity.instance.onResponse(req, res, responseData);
                    return;
                }
            }

            yoga.set(changes);
            const updated = await yoga.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Yoga pose updated successfully",
                httpCode: eHttpStatusCode.OK,
                data: updated,
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
