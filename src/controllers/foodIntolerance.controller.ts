import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import FoodIntoleranceValidator from "../validators/foodIntolerance.validator";
import { iCreateFoodIntolerancePayload, iUpdateFoodIntolerancePayload } from "../interfaces/foodIntolerance.interface";
import FoodIntoleranceDb from "../db/mongo/foodIntolerance.mongo";

export default class FoodIntoleranceController {
    public static instance: FoodIntoleranceController = new FoodIntoleranceController();
    private constructor() { }

    public async createFoodIntolerance(req: Request, res: Response): Promise<void> {
        const { error } = FoodIntoleranceValidator.instance.createSchema.validate(req.body || {});
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
            const payload = req.body as iCreateFoodIntolerancePayload;
            const existingIntolerance = await FoodIntoleranceDb.findOne({ title: payload.title, isDeleted: false });
            if (existingIntolerance) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food intolerance with this title already exists",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const newIntolerance = new FoodIntoleranceDb({
                title: payload.title,
                subtitle: payload.subtitle.trim(),
                imageUrl: payload.imageUrl.trim(),
            });

            const intolerance = await newIntolerance.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food intolerance created successfully",
                httpCode: eHttpStatusCode.OK,
                data: intolerance,
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

    public async getFoodIntoleranceList(req: Request, res: Response): Promise<void> {
        const queryResult = FoodIntoleranceValidator.instance.listQuerySchema.validate(req.query);
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
                FoodIntoleranceDb.countDocuments(filter),
                FoodIntoleranceDb.find(filter)
                    .sort({ createdAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
            ]);

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food intolerance list fetched successfully",
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

    public async updateFoodIntolerance(req: Request, res: Response): Promise<void> {
        const paramsResult = FoodIntoleranceValidator.instance.idParamSchema.validate(req.params);
        const bodyResult = FoodIntoleranceValidator.instance.updateSchema.validate(req.body ?? {});
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
            const payload = bodyResult.value as iUpdateFoodIntolerancePayload;

            const item = await FoodIntoleranceDb.findOne({ _id: id, isDeleted: false });
            if (!item) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food intolerance not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            if (payload.title && payload.title !== item.title) {
                const duplicate = await FoodIntoleranceDb.exists({ title: payload.title, isDeleted: false, _id: { $ne: id } });
                if (duplicate) {
                    const responseData: iResponse = {
                        status: eResponseStatus.ERROR,
                        message: "Food intolerance with this title already exists",
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
                message: "Food intolerance updated successfully",
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

    public async deleteFoodIntolerance(req: Request, res: Response): Promise<void> {
        const paramsResult = FoodIntoleranceValidator.instance.idParamSchema.validate(req.params);
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
            const deleted = await FoodIntoleranceDb.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true } },
                { returnDocument: "after" },
            ).lean();
            if (!deleted) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Food intolerance not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Food intolerance deleted successfully",
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
