import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import DietaryRestrictionValidator from "../validators/dietaryRestriction.validator";
import { iCreateDietaryRestrictionPayload, iUpdateDietaryRestrictionPayload } from "../interfaces/dietaryRestriction.interface";
import DietaryRestrictionDb from "../db/mongo/dietaryRestriction.mongo";

export default class DietaryRestrictionController {
    public static instance: DietaryRestrictionController = new DietaryRestrictionController();
    private constructor() { }

    public async createDietaryRestriction(req: Request, res: Response): Promise<void> {
        const { error } = DietaryRestrictionValidator.instance.createSchema.validate(req.body || {});
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
            const payload = req.body as iCreateDietaryRestrictionPayload;
            const existingRestriction = await DietaryRestrictionDb.findOne({ title: payload.title, isDeleted: false });
            if (existingRestriction) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Dietary restriction with this title already exists",
                    httpCode: eHttpStatusCode.BAD_REQUEST,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const newRestriction = new DietaryRestrictionDb({
                title: payload.title,
                subtitle: payload.subtitle.trim(),
                imageUrl: payload.imageUrl.trim(),
            });

            const restriction = await newRestriction.save();

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Dietary restriction created successfully",
                httpCode: eHttpStatusCode.OK,
                data: restriction,
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

    public async getDietaryRestrictionList(req: Request, res: Response): Promise<void> {
        const queryResult = DietaryRestrictionValidator.instance.listQuerySchema.validate(req.query);
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
                DietaryRestrictionDb.countDocuments(filter),
                DietaryRestrictionDb.find(filter)
                    .sort({ createdAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
            ]);

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Dietary restriction list fetched successfully",
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

    public async updateDietaryRestriction(req: Request, res: Response): Promise<void> {
        const paramsResult = DietaryRestrictionValidator.instance.idParamSchema.validate(req.params);
        const bodyResult = DietaryRestrictionValidator.instance.updateSchema.validate(req.body ?? {});
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
            const payload = bodyResult.value as iUpdateDietaryRestrictionPayload;

            const item = await DietaryRestrictionDb.findOne({ _id: id, isDeleted: false });
            if (!item) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Dietary restriction not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            if (payload.title && payload.title !== item.title) {
                const duplicate = await DietaryRestrictionDb.exists({ title: payload.title, isDeleted: false, _id: { $ne: id } });
                if (duplicate) {
                    const responseData: iResponse = {
                        status: eResponseStatus.ERROR,
                        message: "Dietary restriction with this title already exists",
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
                message: "Dietary restriction updated successfully",
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

    public async deleteDietaryRestriction(req: Request, res: Response): Promise<void> {
        const paramsResult = DietaryRestrictionValidator.instance.idParamSchema.validate(req.params);
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
            const deleted = await DietaryRestrictionDb.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: { isDeleted: true } },
                { returnDocument: "after" },
            ).lean();
            if (!deleted) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Dietary restriction not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Dietary restriction deleted successfully",
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
