import type { Request, Response } from "express";
import type { Types } from "mongoose";
import UserDb from "../db/mongo/users.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iUsers } from "../interfaces/user.interface";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "./common.util";

export interface iReplyCtx {
    req: Request;
    res: Response;
}

export interface iHealthRange {
    days: number;
    from: Date;
    to: Date;
}

export interface iPagination {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}

/** The last `days` calendar days ending now (server's day, like the overview). */
export function resolveRange(days: number): iHealthRange {
    const to = new Date();
    const from = new Date(to);
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    return { days, from, to };
}

/** Server-local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/** Every calendar day of the range, oldest first. */
export function dayKeys(range: iHealthRange): string[] {
    const keys: string[] = [];
    const cursor = new Date(range.from);
    while (cursor <= range.to) {
        keys.push(dayKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
}

export function paginate(params: { page: number; limit: number; totalItems: number }): iPagination {
    const { page, limit, totalItems } = params;
    return { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) };
}

export function round(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

export function average(values: number[]): number | null {
    return values.length ? round(values.reduce((sum, v) => sum + v, 0) / values.length, 1) : null;
}

export function reply(ctx: iReplyCtx, responseData: iResponse): void {
    EncryptionSecurity.instance.onResponse(ctx.req, ctx.res, responseData);
}

export function reject(ctx: iReplyCtx, message: string): void {
    reply(ctx, { status: eResponseStatus.ERROR, message, httpCode: eHttpStatusCode.BAD_REQUEST });
}

export function fail(ctx: iReplyCtx, err: unknown): void {
    const errorRes = toErrorResponse(err);
    reply(ctx, {
        status: eResponseStatus.FAIL,
        message: errorRes.message,
        httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
    });
}

export type tUserDoc = iUsers & { _id: Types.ObjectId };

/** Loads the (not deleted) user, or answers 404 and returns null. */
export async function requireUser(ctx: iReplyCtx, id: string): Promise<tUserDoc | null> {
    const user = await UserDb.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as tUserDoc | null;
    if (!user) {
        reply(ctx, { status: eResponseStatus.ERROR, message: "User not found", httpCode: eHttpStatusCode.NOT_FOUND });
        return null;
    }
    return user;
}
