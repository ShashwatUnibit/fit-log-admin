import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import FoodPreferenceValidator from "../validators/foodPreference.validator";
import { iCreateFoodPreferencePayload } from "../interfaces/foodPreference.interface";
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
}
