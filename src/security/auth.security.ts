import Jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import sanitize from "mongo-sanitize";
import RedisClient from "../db/redis/client.redis";
import { eDevice, eHeadersKeys, eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import { cEnv } from "../consts/env.const";
import { iJwt } from "../interfaces/jwt.interface";
import { cRedisKeys } from "../consts/redis.const";

export default class AuthSecurity {
    public static instance: AuthSecurity = new AuthSecurity();
    private constructor() { }

    // eslint-disable-next-line max-params
    public async validateToken(req: Request, res: Response, next: NextFunction): Promise<Response | null> {
        const authHeader = req.headers.authorization ?? "";
        const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
        const appId = (req.headers[eHeadersKeys.xAppId] ?? req.headers["app-id"] ?? "") as string;
        const appVersion = (req.headers[eHeadersKeys.xAppVersion] ?? req.headers["app-version"] ?? "") as string;
        const platform = (req.headers[eHeadersKeys.xAppPlatform] ?? req.headers["platform"] ?? "") as string;

        // Check for required headers
        if (!appVersion) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "App version header missing",
            };
            return res.status(eHttpStatusCode.BAD_REQUEST).json(responseData);
        }
        
        if (!platform) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Platform header missing",
            };
            return res.status(eHttpStatusCode.BAD_REQUEST).json(responseData);
        }

        if (platform !== eDevice.IOS && platform !== eDevice.ANDROID && platform !== eDevice.WEB) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Invalid platform",
            };
            return res.status(eHttpStatusCode.BAD_REQUEST).json(responseData);
        }

        if (!appId || appId !== cEnv.APP_ID) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Invalid App ID",
            };
            return res.status(eHttpStatusCode.UNAUTHORIZED).json(responseData);
        }

        if (!bearer) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "No token provided",
            };
            return res.status(eHttpStatusCode.UNAUTHORIZED).json(responseData);
        }
        try {
            this.sanitizeData(req);

            const decoded = Jwt.verify(bearer, cEnv.JWT_SECRET);
            if (!decoded) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Failed to authenticate token",
                };
                return res.status(eHttpStatusCode.UNAUTHORIZED).json(responseData);
            }
            const decodedPayload = decoded as iJwt;
            req.headers[eHeadersKeys.xUserId] = decodedPayload.userId;
            req.headers[eHeadersKeys.xSessionId] = decodedPayload.sessionId;

            const isSessionValid = await this.validateSession(decodedPayload.userId, decodedPayload.sessionId);
            if (!isSessionValid) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "Invalid session. Please log in again.",
                };
                return res.status(eHttpStatusCode.UNAUTHORIZED).json(responseData);
            }
            next();
            return null;
        } catch (error) {
            console.log("Token validation error:", error);
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Failed to authenticate token",
            };
            return res.status(eHttpStatusCode.UNAUTHORIZED).json(responseData);
        }
    }

    // eslint-disable-next-line max-params
    public async validateAppId(req: Request, res: Response, next: NextFunction): Promise<null | Response> {
        const appId = (req.headers[eHeadersKeys.xAppId] ?? req.headers["app-id"] ?? "") as string;
        const appVersion = (req.headers[eHeadersKeys.xAppVersion] ?? req.headers["app-version"] ?? "") as string;
        const platform = (req.headers[eHeadersKeys.xAppPlatform] ?? req.headers["platform"] ?? "") as string;

        // Check for required headers
        if (!appVersion) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "App version header missing",
            };
            return res.status(eHttpStatusCode.BAD_REQUEST).json(responseData);
        }

        if (!platform) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Platform header missing",
            };
            return res.status(eHttpStatusCode.BAD_REQUEST).json(responseData);
        }

        if (platform !== eDevice.IOS && platform !== eDevice.ANDROID && platform !== eDevice.WEB) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Invalid platform",
            };
            return res.status(eHttpStatusCode.BAD_REQUEST).json(responseData);
        }

        if (!appId || appId !== cEnv.APP_ID) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Invalid App ID",
            };
            return res.status(eHttpStatusCode.UNAUTHORIZED).json(responseData);
        }
        this.sanitizeData(req);
        next();
        return null;
    }

    // eslint-disable-next-line max-params
    public async validateServerKey(req: Request, res: Response, next: NextFunction): Promise<Response | null> {
        const serverKey = req.headers[eHeadersKeys.xServerKey] ?? "";
        if (!serverKey || serverKey !== cEnv.SERVER_S2S_KEY) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: "Invalid Server Key",
            };
            return res.status(eHttpStatusCode.UNAUTHORIZED).json(responseData);
        }
        this.sanitizeData(req);
        next();
        return null;
    }

    private async validateSession(userId: string, sessionId: string): Promise<boolean> {
        const getSessionId = await RedisClient.instance.getData(cRedisKeys.session(userId));
        if (!getSessionId || getSessionId !== sessionId) {
            return false;
        }
        return true;
    }

    private sanitizeText(value: string): string {
        return value
            .trim()
            .replace(/\$/g, "")
            .replace(/==/g, "")
            .replace(/'/g, "")
            .replace(/;/g, "")
            .replace(/`/g, "")
            .replace(/"/g, "");
    }

    private sanitizePayload(payload: Record<string, unknown>): void {
        Object.keys(payload).forEach((key) => {
            const sanitizedValue = sanitize(payload[key]);
            payload[key] = typeof sanitizedValue === "string" ? this.sanitizeText(sanitizedValue) : sanitizedValue;
        });
    }

    private sanitizeData(req: Request): void {
        try {
            if (req.body && typeof req.body === "object") {
                this.sanitizePayload(req.body as Record<string, unknown>);
            }
            this.sanitizePayload(req.query);
            this.sanitizePayload(req.params);
        } catch (error) {
            console.log(error);
        }
    }
}
