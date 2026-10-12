import { NextFunction, Request, Response } from "express";
import CryptoJS from "crypto-js";
import { cEnv } from "../consts/env.const";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";

export default class EncryptionSecurity {
    public static instance: EncryptionSecurity = new EncryptionSecurity();

    private readonly encryptionKey: string = cEnv.ENCRYPTION_KEY;
    private readonly encryptionExemptUrls: string[] = [
        "/api/s2s/",
        "/api/v1/webhook",
        "/api/v1/upload",
    ];

    private constructor() { }

    private invalidRequest(res: Response): Response {
        const finalResponse: iResponse = {
            status: eResponseStatus.ERROR,
            message: "Invalid request",
        };
        return res.status(eHttpStatusCode.BAD_REQUEST).json(finalResponse);
    }

    private isEncBypassedReq(req: Request, _isReq: boolean): boolean {
        const { enc } = req.query;
        if (typeof enc === "string" && enc === "false" && (cEnv.SERVER_ENV === "dev" || cEnv.SERVER_ENV === "development")) {
            return true;
        }

        return this.encryptionExemptUrls.some((url) => req.originalUrl.includes(url));
    }

    private isHashValid(req: Request): boolean {
        if (typeof req.headers.hash !== "string" || !req.headers.hash) {
            return false;
        }

        try {
            const decrypted = CryptoJS.AES.decrypt(req.headers.hash, this.encryptionKey);
            const decryptedUrl = decrypted.toString(CryptoJS.enc.Utf8);
            return decryptedUrl === req.originalUrl;
        } catch {
            return false;
        }
    }

    private getDecryptedBody(req: Request): Record<string, unknown> | null {
        const body = req.body as Record<string, unknown> | undefined;
        const encryptedPayload = body?.data;

        if (typeof encryptedPayload !== "string" || !encryptedPayload) {
            return null;
        }

        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedPayload, this.encryptionKey);
            const decryptedBody = decrypted.toString(CryptoJS.enc.Utf8);
            if (!decryptedBody) {
                return null;
            }
            const parsedBody: unknown = JSON.parse(decryptedBody);
            if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
                return null;
            }
            return parsedBody as Record<string, unknown>;
        } catch {
            return null;
        }
    }

    // eslint-disable-next-line max-params
    public onRequest(req: Request, res: Response, next: NextFunction): Response | null {
        if (this.isEncBypassedReq(req, true)) {
            next();
            return null;
        }

        if (req.method === "GET" || req.method === "DELETE") {
            if (!this.isHashValid(req)) {
                return this.invalidRequest(res);
            }
            next();
            return null;
        }

        if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
            const decryptedBody = this.getDecryptedBody(req);

            if (decryptedBody !== null) {
                req.body = decryptedBody;
                next();
                return null;
            }

            if (!this.isHashValid(req)) {
                return this.invalidRequest(res);
            }

            next();
            return null;
        }

        return this.invalidRequest(res);
    }

    // eslint-disable-next-line max-params
    public onResponse(req: Request, res: Response, resData: iResponse): void {
        const httpCode = resData.httpCode ?? eHttpStatusCode.OK;
        delete resData.httpCode;

        if (this.isEncBypassedReq(req, false)) {
            res.status(httpCode).json(resData);
            return;
        }
        const data = resData.data ? JSON.stringify(resData.data) : null;
        const encryptedData = data ? CryptoJS.AES.encrypt(data, this.encryptionKey).toString() : null;
        const finalResponse: Record<string, unknown> = {
            status: resData.status,
            message: resData.message,
        };
        if (encryptedData) {
            finalResponse.data = encryptedData;
        }
        res.status(httpCode).json(finalResponse);
    }
}