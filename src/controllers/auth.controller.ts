import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import AuthValidator from "../validators/auth.validator";
import AuthService from "../services/auth.service";
import { iAdminAutoLoginPayload, iAdminLoginPayload } from "../interfaces/loginPayloadAndResponse.interface";

export default class AuthController {
    public static instance: AuthController = new AuthController();
    private constructor() { }

    public async adminLogin(req: Request, res: Response): Promise<void> {
        const { error } = AuthValidator.instance.loginSchema.validate(req.body || {});
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
            const payload = req.body as iAdminLoginPayload;
            const loginResult = await AuthService.instance.adminLogin(payload);

            res.setHeader("Authorization", `Bearer ${loginResult.token}`);

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Admin logged in successfully",
                httpCode: eHttpStatusCode.OK,
                data: loginResult.admin,
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

    public async adminAutoLogin(req: Request, res: Response): Promise<void> {
        const { error } = AuthValidator.instance.autoLoginSchema.validate(req.body || {});
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
            const payload = req.body as iAdminAutoLoginPayload;
            const loginResult = await AuthService.instance.adminAutoLogin(payload);

            res.setHeader("Authorization", `Bearer ${loginResult.token}`);

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Admin auto-logged in successfully",
                httpCode: eHttpStatusCode.OK,
                data: loginResult.admin,
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