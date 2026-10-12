import { Request, Response } from "express";
import DataValidator from "../validators/data.validator";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { eDietaryRestrictions, eFoodAllergies, eFoodIntolerances, eFoodPreferences } from "../enums/foodItems.enum";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";
import { iStaticData } from "../interfaces/data.interface";
import { toErrorResponse } from "../utils/common.util";

export default class DataController {
    public static instance: DataController = new DataController();
    private constructor() { }

    public async getData(req: Request, res: Response): Promise<void> {
        const vResult = DataValidator.instance.sampleSchema.validate(req.query);
        if (vResult.error) {
            const errorResponse: iResponse = {
                status: eResponseStatus.ERROR,
                message: vResult.error.message || "Invalid query parameters",
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, errorResponse);
            return;
        }

        const { amount } = vResult.value;

        const response: iResponse = {
            status: eResponseStatus.SUCCESS,
            message: "Data fetched successfully",
            data: { amount },
            httpCode: eHttpStatusCode.OK,
        };
        EncryptionSecurity.instance.onResponse(req, res, response);
    }

    public async getStaticData(req: Request, res: Response): Promise<void> {
        try {
            const staticData: iStaticData = {
                foodPreferences: Object.values(eFoodPreferences),
                foodAllergies: Object.values(eFoodAllergies),
                foodIntolerance: Object.values(eFoodIntolerances),
                dietaryRestrictions: Object.values(eDietaryRestrictions),
                focusPart: Object.values(eFocusPart),
                exerciseLevel: Object.values(eExerciseLevel),
                exerciseType: Object.values(eExerciseType),
            };

            const response: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Static data fetched successfully",
                data: staticData,
                httpCode: eHttpStatusCode.OK,
            };
            EncryptionSecurity.instance.onResponse(req, res, response);
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

