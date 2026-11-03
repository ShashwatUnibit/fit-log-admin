import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import FoodAllergyValidator from "../validators/foodAllergy.validator";
import { iCreateFoodAllergyPayload, iUpdateFoodAllergyPayload } from "../interfaces/foodAllergy.interface";
import FoodAllergyDb from "../db/mongo/foodAllergy.mongo";

export default class FoodAllergyController {
    public static instance: FoodAllergyController = new FoodAllergyController();
    private constructor() { }

    public async createFoodAllergy(req: Request, res: Response): Promise<void> {
        const { error } = FoodAllergyValidator.instance.createSchema.validate(req.body || {});
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
            const payload = req.body as iCreateFoodAllergyPayload;
            const existingAllergy = await FoodAllergyDb.findOne({ title: payload.title, isDeleted: false });
            if (existingAllergy) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food allergy with this title already exists",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const newAllergy = new FoodAllergyDb({
                title: payload.title,
                subtitle: payload.subtitle.trim(),
                imageUrl: payload.imageUrl.trim(),
            });

            const allergy = await newAllergy.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food allergy created successfully",
                httpCode: eHttpStatusCode.OK,
                data: allergy,
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

    public async getFoodAllergyList(req: Request, res: Response): Promise<void> {
        const queryResult = FoodAllergyValidator.instance.listQuerySchema.validate(req.query);
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
                FoodAllergyDb.countDocuments(filter),
                FoodAllergyDb.find(filter)
                    .sort({ createdAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
            ]);

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food allergy list fetched successfully",
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

    public async updateFoodAllergy(req: Request, res: Response): Promise<void> {
        const paramsResult = FoodAllergyValidator.instance.idParamSchema.validate(req.params);
        const bodyResult = FoodAllergyValidator.instance.updateSchema.validate(req.body ?? {});
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
            const payload = bodyResult.value as iUpdateFoodAllergyPayload;

            const item = await FoodAllergyDb.findOne({ _id: id, isDeleted: false });
            if (!item) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food allergy not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            if (payload.title && payload.title !== item.title) {
                const duplicate = await FoodAllergyDb.exists({ title: payload.title, isDeleted: false, _id: { $ne: id } });
                if (duplicate) {
                    const responseData: iResponse = {
                        status: eResponseStatus.ERROR,
                        message: "Food allergy with this title already exists",
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
                message: "Food allergy updated successfully",
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

    public async deleteFoodAllergy(req: Request, res: Response): Promise<void> {
        const paramsResult = FoodAllergyValidator.instance.idParamSchema.validate(req.params);
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
            const deleted = await FoodAllergyDb.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true } },
                { returnDocument: "after" },
            ).lean();
            if (!deleted) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food allergy not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food allergy deleted successfully",
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
