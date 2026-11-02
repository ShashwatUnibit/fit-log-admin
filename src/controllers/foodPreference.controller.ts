import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import FoodPreferenceValidator from "../validators/foodPreference.validator";
import { iCreateFoodPreferencePayload, iUpdateFoodPreferencePayload } from "../interfaces/foodPreference.interface";
import FoodPreferenceDb from "../db/mongo/foodPreference.mongo";

export default class FoodPreferenceController {
    public static instance: FoodPreferenceController = new FoodPreferenceController();
    private constructor() { }

    public async createFoodPreference(req: Request, res: Response): Promise<void> {
        const { error } = FoodPreferenceValidator.instance.createSchema.validate(req.body || {});
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
            const payload = req.body as iCreateFoodPreferencePayload;
            const existingPreference = await FoodPreferenceDb.findOne({ title: payload.title, isDeleted: false });
            if (existingPreference) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food preference with this title already exists",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const newPreference = new FoodPreferenceDb({
                title: payload.title,
                subtitle: payload.subtitle.trim(),
                imageUrl: payload.imageUrl.trim(),
            });

            const preference = await newPreference.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food preference created successfully",
                httpCode: eHttpStatusCode.OK,
                data: preference,
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

    public async getFoodPreferenceList(req: Request, res: Response): Promise<void> {
        const queryResult = FoodPreferenceValidator.instance.listQuerySchema.validate(req.query);
        if (queryResult.error) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: queryResult.error.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const { page, limit } = queryResult.value;
            const filter = { isDeleted: false };
            const [totalItems, items] = await Promise.all([
                FoodPreferenceDb.countDocuments(filter),
                FoodPreferenceDb.find(filter)
                    .sort({ createdAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
            ]);

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food preference list fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: { items, pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } },
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

    public async updateFoodPreference(req: Request, res: Response): Promise<void> {
        const paramsResult = FoodPreferenceValidator.instance.idParamSchema.validate(req.params);
        const bodyResult = FoodPreferenceValidator.instance.updateSchema.validate(req.body ?? {});
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
            const payload = bodyResult.value as iUpdateFoodPreferencePayload;

            const item = await FoodPreferenceDb.findOne({ _id: id, isDeleted: false });
            if (!item) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food preference not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            if (payload.title && payload.title !== item.title) {
                const duplicate = await FoodPreferenceDb.exists({ title: payload.title, isDeleted: false, _id: { $ne: id } });
                if (duplicate) {
                    const responseData: iResponse = {
                        status: eResponseStatus.ERROR,
                        message: "Food preference with this title already exists",
                        httpCode: eHttpStatusCode.CONFLICT,
                    };
                    EncryptionSecurity.instance.onResponse(req, res, responseData);
                    return;
                }
            }

            item.set(payload);
            const updated = await item.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food preference updated successfully",
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

    public async deleteFoodPreference(req: Request, res: Response): Promise<void> {
        const paramsResult = FoodPreferenceValidator.instance.idParamSchema.validate(req.params);
        if (paramsResult.error) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: paramsResult.error.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const { id } = req.params as { id: string };
            const deleted = await FoodPreferenceDb.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true } },
                { new: true },
            ).lean();
            if (!deleted) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food preference not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food preference deleted successfully",
                httpCode: eHttpStatusCode.OK,
                data: deleted,
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
