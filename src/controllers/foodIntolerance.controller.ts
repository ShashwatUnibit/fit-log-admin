import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import FoodIntoleranceValidator from "../validators/foodIntolerance.validator";
import { iCreateFoodIntolerancePayload } from "../interfaces/foodIntolerance.interface";
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
}
