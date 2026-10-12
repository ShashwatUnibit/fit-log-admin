import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import DietaryRestrictionValidator from "../validators/dietaryRestriction.validator";
import { iCreateDietaryRestrictionPayload } from "../interfaces/dietaryRestriction.interface";
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
}
