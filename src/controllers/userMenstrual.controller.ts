import type { Request, Response } from "express";
import type { ObjectSchema } from "joi";
import { MenstrualInsightDb, MenstrualProfileDb, PeriodLogDb } from "../db/mongo/menstrual.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iPeriodLog } from "../interfaces/menstrual.interface";
import MenstrualCycleService, { calendarDay, dateString, loggedPeriodLength } from "../services/menstrualCycle.service";
import { average, fail, iReplyCtx, paginate, reject, reply, requireUser } from "../utils/healthRange.util";
import { humanize } from "../utils/healthStatus.util";
import UserHealthValidator from "../validators/userHealth.validator";
import UserValidator from "../validators/user.validator";

type tPeriodLogDoc = iPeriodLog & { _id: unknown };

// The user app keeps one insight per day, keyed by the day in India (UTC+05:30).
const APP_UTC_OFFSET_MINUTES = 330;
const PERIOD_LOG_HISTORY_CAP = 500;

function insightDateKey(now: Date): string {
    return new Date(now.getTime() + APP_UTC_OFFSET_MINUTES * 60 * 1000).toISOString().slice(0, 10);
}

function isFemale(gender?: string): boolean {
    return gender?.trim().toLowerCase() === "female";
}

export default class UserMenstrualController {
    public static instance: UserMenstrualController = new UserMenstrualController();
    private constructor() {}

    /**
     * The cycle profile, where the user is in her cycle, the next predicted period, a 3-cycle timeline and
     * today's AI insight (only read if it was already generated; this never starts an AI call).
     */
    public async getMenstrualOverview(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.menstrualQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const isApplicable = isFemale(user.gender);
            const profile = isApplicable ? await MenstrualProfileDb.findOne({ userId: user._id }).lean() : null;
            if (!profile) {
                reply(ctx, {
                    status: eResponseStatus.SUCCESS,
                    message: isApplicable ? "Menstrual profile not created" : "Menstrual tracking does not apply to this user",
                    httpCode: eHttpStatusCode.OK,
                    data: { isApplicable, hasProfile: false },
                });
                return;
            }

            const now = new Date();
            const [logs, insight] = await Promise.all([
                PeriodLogDb.find({ userId: user._id }).sort({ periodStartDate: -1 }).limit(PERIOD_LOG_HISTORY_CAP).lean() as Promise<iPeriodLog[]>,
                MenstrualInsightDb.findOne({ userId: user._id, dateKey: insightDateKey(now), status: "ready" }).lean(),
            ]);
            const cycle = MenstrualCycleService.instance.calculate({ profile, logs, now });

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Menstrual overview fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    isApplicable,
                    hasProfile: true,
                    profile: {
                        lastPeriodStartDate: dateString(calendarDay(profile.lastPeriodStartDate)),
                        typicalCycleLength: profile.typicalCycleLength,
                        typicalPeriodLength: profile.typicalPeriodLength,
                        cycleRegularity: profile.cycleRegularity,
                        cycleRegularityLabel: humanize(profile.cycleRegularity),
                        trackingStartedAt: profile.trackingStartedAt ?? null,
                        updatedAt: profile.updatedAt ?? null,
                    },
                    currentCycle: {
                        // Where the numbers below come from: the latest logged period, or the profile when none is logged
                        lastPeriodStart: cycle.lastPeriodStart,
                        lastPeriodSource: cycle.lastPeriodSource,
                        cycleLengthDays: cycle.cycleLengthDays,
                        periodLengthDays: cycle.periodLengthDays,
                        cycleDay: cycle.cycleDay,
                        phase: cycle.phase.phase,
                        phaseLabel: cycle.phase.label,
                        status: cycle.status,
                        daysOverdue: cycle.daysOverdue,
                        phases: cycle.phases,
                    },
                    nextPeriod: {
                        date: cycle.nextPeriod.date,
                        inDays: cycle.nextPeriod.inDays,
                        expectedLengthDays: cycle.periodLengthDays,
                        status: cycle.status,
                        daysOverdue: cycle.daysOverdue,
                    },
                    timeline: cycle.timeline,
                    loggedPeriodCount: logs.length,
                    insight: insight
                        ? { phase: insight.phase, tips: insight.tips, remedies: insight.remedies, generatedAt: insight.createdAt ?? null, isAiGenerated: true }
                        : null,
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Every period the user logged, newest first, with flow, symptoms, notes and the gap since the previous period. */
    public async getPeriodLogs(req: Request, res: Response): Promise<void> {
        const ctx = { req, res };
        const query = this.parse({ ctx, schema: UserHealthValidator.instance.periodLogListQuerySchema });
        if (!query) {
            return;
        }

        try {
            const user = await requireUser(ctx, (req.params as { id: string }).id);
            if (!user) {
                return;
            }
            const { page, limit } = query;
            // A user logs a handful of periods a year, so the whole history is small and is paged here
            const logs = await PeriodLogDb.find({ userId: user._id }).sort({ periodStartDate: -1, _id: -1 }).limit(PERIOD_LOG_HISTORY_CAP).lean() as tPeriodLogDoc[];

            const gapDays = (index: number): number | null => {
                const older = logs.at(index + 1);
                return older ? Math.round((calendarDay(logs[index].periodStartDate) - calendarDay(older.periodStartDate)) / (24 * 60 * 60 * 1000)) : null;
            };
            const items = logs.map((log, index) => ({
                id: String(log._id),
                periodStartDate: dateString(calendarDay(log.periodStartDate)),
                periodEndDate: log.periodEndDate ? dateString(calendarDay(log.periodEndDate)) : null,
                durationDays: loggedPeriodLength(log),
                flowIntensity: log.flowIntensity,
                flowLabel: humanize(log.flowIntensity),
                symptoms: log.symptoms.map((key) => ({ key, label: humanize(key) })),
                notes: log.notes?.trim() ? log.notes : null,
                cycleLengthDays: gapDays(index),
                loggedAt: log.createdAt ?? null,
            }));

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Period logs fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    summary: {
                        totalLogs: logs.length,
                        averageCycleLengthDays: average(items.map((i) => i.cycleLengthDays).filter((n): n is number => n !== null && n >= 15 && n <= 60)),
                        averagePeriodLengthDays: average(items.map((i) => i.durationDays).filter((n): n is number => n !== null)),
                    },
                    logs: items.slice((page - 1) * limit, page * limit),
                    pagination: paginate({ page, limit, totalItems: items.length }),
                },
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
