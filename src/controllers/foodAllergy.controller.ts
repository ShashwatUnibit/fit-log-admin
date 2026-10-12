import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import FoodAllergyValidator from "../validators/foodAllergy.validator";
import { iCreateFoodAllergyPayload } from "../interfaces/foodAllergy.interface";
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
}
