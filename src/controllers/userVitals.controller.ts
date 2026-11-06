import type { Request, Response } from "express";
import type { ObjectSchema } from "joi";
import type { Types } from "mongoose";
import { BloodPressureLogDb, BloodSugarLogDb, HeartRateLogDb } from "../db/mongo/healthLog.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iHealthLog } from "../interfaces/healthLog.interface";
import { average, dayKey, fail, iReplyCtx, paginate, reject, reply, requireUser, resolveRange } from "../utils/healthRange.util";
import { bloodPressureStatus, bloodSugarStatus, heartRateStatus, humanize, tHealthStatus } from "../utils/healthStatus.util";
import UserHealthValidator from "../validators/userHealth.validator";
import UserValidator from "../validators/user.validator";

type tLog = iHealthLog & { _id: Types.ObjectId };

interface iBpReading {
    systolic: number;
    diastolic: number;
    status: tHealthStatus;
    loggedAt: Date;
}

interface iSugarReading {
    value: number;
    unit: "mg/dL";
    mealContext: string | null;
    mealContextLabel: string | null;
    status: tHealthStatus;
    loggedAt: Date;
}

interface iHeartReading {
    bpm: number;
    unit: "bpm";
    status: tHealthStatus;
    loggedAt: Date;
}

const SELECT_BP = "systolic diastolic date createdAt";
const SELECT_SUGAR = "bloodSugar mealContext date createdAt";
const SELECT_HR = "beatsPerMinute createdAt";

/** When a reading was taken: the user-entered date, else when it was saved. */
function takenAt(log: tLog): Date {
    return log.date ?? log.createdAt ?? new Date(0);
}

function isAboveNormal(status: tHealthStatus): boolean {
    return status === "Elevated" || status === "High";
}

function bpReading(log: tLog): iBpReading {
    const systolic = log.systolic ?? 0;
    const diastolic = log.diastolic ?? 0;
    return { systolic, diastolic, status: bloodPressureStatus({ systolic, diastolic }), loggedAt: takenAt(log) };
}

function sugarReading(log: tLog): iSugarReading {
    const value = log.bloodSugar ?? 0;
    return {
        value,
        unit: "mg/dL",
        mealContext: log.mealContext ?? null,
        mealContextLabel: log.mealContext ? humanize(log.mealContext) : null,
        status: bloodSugarStatus({ value, mealContext: log.mealContext }),
        loggedAt: takenAt(log),
    };
}

function heartReading(log: tLog): iHeartReading {
    const bpm = log.beatsPerMinute ?? 0;
    return { bpm, unit: "bpm", status: heartRateStatus(bpm), loggedAt: takenAt(log) };
}

export default class UserVitalsController {
    public static instance: UserVitalsController = new UserVitalsController();
    private constructor() {}

    /** Latest blood pressure, averages and counts for the last 7/30/90 days, and the highest reading of each day (graph). */
    public async getBloodPressureSummary(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.summaryQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const range = resolveRange(query.days);
            const [latest, logs] = await Promise.all([
                BloodPressureLogDb.findOne({ userId: user._id }).sort({ date: -1, createdAt: -1 }).select(SELECT_BP).lean() as Promise<tLog | null>,
                BloodPressureLogDb.find({ userId: user._id, date: { $gte: range.from, $lte: range.to } }).select(SELECT_BP).lean() as Promise<tLog[]>,
            ]);

            const readings = logs.map(bpReading);
            const highestPerDay = new Map<string, iBpReading>();
            for (const r of readings) {
                const key = dayKey(r.loggedAt);
                const best = highestPerDay.get(key);
                if (!best || r.systolic > best.systolic || (r.systolic === best.systolic && r.diastolic > best.diastolic)) {
                    highestPerDay.set(key, r);
                }
            }

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Blood pressure summary fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    range: { days: range.days, from: range.from, to: range.to },
                    hasAnyData: latest !== null,
                    latest: latest ? { ...bpReading(latest), unit: "mmHg" } : null,
                    average: { systolic: average(readings.map((r) => r.systolic)), diastolic: average(readings.map((r) => r.diastolic)), unit: "mmHg" },
                    totalReadings: readings.length,
                    aboveNormalCount: readings.filter((r) => isAboveNormal(r.status)).length,
                    dailyHighest: [...highestPerDay.entries()]
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([date, r]) => ({ date, ...r })),
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Every blood pressure entry, newest first. */
    public async getBloodPressureReadings(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.listQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const { page, limit, days } = query;
            const filter: Record<string, unknown> = { userId: user._id };
            if (days) {
                const range = resolveRange(days);
                filter.date = { $gte: range.from, $lte: range.to };
            }
            const [totalItems, logs] = await Promise.all([
                BloodPressureLogDb.countDocuments(filter),
                BloodPressureLogDb.find(filter).sort({ date: -1, createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select(SELECT_BP).lean() as Promise<tLog[]>,
            ]);

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Blood pressure readings fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    readings: logs.map((log) => ({ id: String(log._id), ...bpReading(log), unit: "mmHg" })),
                    pagination: paginate({ page, limit, totalItems }),
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Latest blood sugar, average, counts outside normal, and the readings of the range (graph), optionally for one meal context. */
    public async getBloodSugarSummary(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.sugarSummaryQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const { days, mealContext } = query;
            const range = resolveRange(days);
            const contextFilter = mealContext === "all" ? {} : { mealContext };
            const [anyReading, latest, logs] = await Promise.all([
                BloodSugarLogDb.exists({ userId: user._id }),
                BloodSugarLogDb.findOne({ userId: user._id, ...contextFilter }).sort({ date: -1, createdAt: -1 }).select(SELECT_SUGAR).lean() as Promise<tLog | null>,
                BloodSugarLogDb.find({ userId: user._id, ...contextFilter, date: { $gte: range.from, $lte: range.to } }).sort({ date: 1, createdAt: 1 }).select(SELECT_SUGAR).lean() as Promise<tLog[]>,
            ]);

            const readings = logs.map(sugarReading);
            const count = (status: tHealthStatus): number => readings.filter((r) => r.status === status).length;
            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Blood sugar summary fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    range: { days: range.days, from: range.from, to: range.to },
                    mealContext,
                    hasAnyData: anyReading !== null,
                    latest: latest ? sugarReading(latest) : null,
                    average: { value: average(readings.map((r) => r.value)), unit: "mg/dL" },
                    totalReadings: readings.length,
                    outsideNormal: { low: count("Low"), elevated: count("Elevated"), high: count("High"), total: readings.length - count("Normal") },
                    readings,
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Every blood sugar entry with its meal context, newest first. */
    public async getBloodSugarReadings(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.sugarListQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const { page, limit, days, mealContext } = query;
            const filter: Record<string, unknown> = { userId: user._id };
            if (mealContext !== "all") {
                filter.mealContext = mealContext;
            }
            if (days) {
                const range = resolveRange(days);
                filter.date = { $gte: range.from, $lte: range.to };
            }
            const [totalItems, logs] = await Promise.all([
                BloodSugarLogDb.countDocuments(filter),
                BloodSugarLogDb.find(filter).sort({ date: -1, createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select(SELECT_SUGAR).lean() as Promise<tLog[]>,
            ]);

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Blood sugar readings fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: { readings: logs.map((log) => ({ id: String(log._id), ...sugarReading(log) })), pagination: paginate({ page, limit, totalItems }) },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Latest heart rate, average, lowest and highest (with time), and the highest bpm of each day (graph). */
    public async getHeartRateSummary(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.summaryQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const range = resolveRange(query.days);
            const [latest, logs] = await Promise.all([
                HeartRateLogDb.findOne({ userId: user._id }).sort({ createdAt: -1 }).select(SELECT_HR).lean() as Promise<tLog | null>,
                HeartRateLogDb.find({ userId: user._id, createdAt: { $gte: range.from, $lte: range.to } }).select(SELECT_HR).lean() as Promise<tLog[]>,
            ]);

            // Oldest first, so a tie goes to the earlier reading
            const readings = logs.map(heartReading).sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
            const lowest = readings.reduce<iHeartReading | null>((best, r) => (!best || r.bpm < best.bpm ? r : best), null);
            const highest = readings.reduce<iHeartReading | null>((best, r) => (!best || r.bpm > best.bpm ? r : best), null);
            const highestPerDay = new Map<string, iHeartReading>();
            for (const r of readings) {
                const key = dayKey(r.loggedAt);
                const best = highestPerDay.get(key);
                if (!best || r.bpm > best.bpm) {
                    highestPerDay.set(key, r);
                }
            }

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Heart rate summary fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    range: { days: range.days, from: range.from, to: range.to },
                    hasAnyData: latest !== null,
                    latest: latest ? heartReading(latest) : null,
                    average: { value: average(readings.map((r) => r.bpm)), unit: "bpm" },
                    totalReadings: readings.length,
                    minimum: lowest,
                    maximum: highest,
                    dailyHighest: [...highestPerDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, r]) => ({ date, ...r })),
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Every heart rate entry, newest first. */
    public async getHeartRateReadings(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.listQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const { page, limit, days } = query;
            const filter: Record<string, unknown> = { userId: user._id };
            if (days) {
                const range = resolveRange(days);
                filter.createdAt = { $gte: range.from, $lte: range.to };
            }
            const [totalItems, logs] = await Promise.all([
                HeartRateLogDb.countDocuments(filter),
                HeartRateLogDb.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select(SELECT_HR).lean() as Promise<tLog[]>,
            ]);

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Heart rate readings fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: { readings: logs.map((log) => ({ id: String(log._id), ...heartReading(log) })), pagination: paginate({ page, limit, totalItems }) },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Validates the :id param and the query; answers 400 and returns null when either is wrong. */
    private parse<Q>(args: { ctx: iReplyCtx; schema: ObjectSchema<Q> }): Q | null {
        const { ctx, schema } = args;
        const idResult = UserValidator.instance.userIdParamSchema.validate(ctx.req.params);
        if (idResult.error) {
            reject(ctx, idResult.error.message);
            return null;
        }
        const result = schema.validate(ctx.req.query);
        if (result.error) {
            reject(ctx, result.error.message);
            return null;
        }
        return result.value;
    }
}
