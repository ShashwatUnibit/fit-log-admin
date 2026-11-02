import type { Request, Response } from "express";
import CryptoJS from "crypto-js";
import AdminDb from "../db/mongo/admin.mongo";
import { eAdminType } from "../enums/admin.enum";
import { eHeadersKeys, eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iAddAdminPayload } from "../interfaces/adminPayload.interface";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import AdminValidator from "../validators/admin.validator";

export default class AdminController {
    public static instance: AdminController = new AdminController();
    private constructor() {}

    public async addAdmin(req: Request, res: Response): Promise<void> {
        const result = AdminValidator.instance.addAdminSchema.validate((req.body ?? {}) as iAddAdminPayload);
        if (result.error) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: result.error.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const payload = result.value;

            const caller = await AdminDb.findOne({
                _id: req.headers[eHeadersKeys.xUserId],
                isDeleted: false,
                isActive: true,
            }).lean();
            if (caller?.adminType !== eAdminType.SUPERADMIN) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Only a superAdmin can add an admin",
                    httpCode: eHttpStatusCode.FORBIDDEN,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const emailId = payload.emailId.toLowerCase();
            const existing = await AdminDb.findOne({ emailId }).lean();
            if (existing) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Admin already exists with this email ID",
                    httpCode: eHttpStatusCode.CONFLICT,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const admin = await AdminDb.create({
                emailId,
                fullName: payload.fullName,
                adminType: payload.adminType,
                password: CryptoJS.MD5(payload.password).toString(),
                isActive: true,
                isDeleted: false,
            });

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Admin added successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    _id: admin._id,
                    fullName: admin.fullName,
                    emailId: admin.emailId,
                    adminType: admin.adminType,
                    isActive: admin.isActive,
                },
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
