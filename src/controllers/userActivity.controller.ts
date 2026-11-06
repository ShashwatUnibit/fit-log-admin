import type { Request, Response } from "express";
import type { Types } from "mongoose";
import type { ObjectSchema } from "joi";
import { DEFAULT_STEPS_GOAL, DEFAULT_WATER_GOAL_GLASSES } from "../consts/alertThreshold.const";
import { MoodLogDb, StepsLogDb, WaterLogDb } from "../db/mongo/healthLog.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iHealthLog } from "../interfaces/healthLog.interface";
import { average, dayKey, dayKeys, fail, iReplyCtx, paginate, reject, reply, requireUser, resolveRange, round } from "../utils/healthRange.util";
import { cMoodSentiments, humanize, moodSentiment, tMoodSentiment } from "../utils/healthStatus.util";
import UserHealthValidator from "../validators/userHealth.validator";
import UserValidator from "../validators/user.validator";

type tLog = iHealthLog & { _id: Types.ObjectId };

interface iDay {
    date: string;
    steps: number;
    water: number;
}

const RECENT_MOOD_LIMIT = 10;
const DEFAULT_ACTIVITY_DAYS = 30;

function percentOfGoal(value: number, goal: number): number {
    return goal > 0 ? Math.round((value / goal) * 100) : 0;
}

function moodEntry(log: tLog): { id: string; mood: string; label: string; sentiment: tMoodSentiment; note: string | null; loggedAt: Date } {
    const mood = log.mood ?? "";
    return {
        id: String(log._id),
        mood,
        label: humanize(mood),
        sentiment: moodSentiment(mood),
        note: log.description?.trim() ? log.description : null,
        loggedAt: log.date ?? log.createdAt ?? new Date(0),
    };
}

export default class UserActivityController {
    public static instance: UserActivityController = new UserActivityController();
    private constructor() {}

    /** Today's steps and water against the user's goals, per-day averages, days the goal was met, and the per-day totals (graph). */
    public async getActivitySummary(req: Request, res: Response): Promise<void> {
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
            const stepsGoal = user.stepsGoal && user.stepsGoal > 0 ? user.stepsGoal : DEFAULT_STEPS_GOAL;
            const waterGoal = user.goalWaterIntake && user.goalWaterIntake > 0 ? user.goalWaterIntake : DEFAULT_WATER_GOAL_GLASSES;
            const [anySteps, anyWater, days] = await Promise.all([
                StepsLogDb.exists({ userId: user._id }),
                WaterLogDb.exists({ userId: user._id }),
                this.loadDays({ userId: user._id, range }),
            ]);

            const today = days[days.length - 1];
            const stepDays = days.filter((d) => d.steps > 0);
            const waterDays = days.filter((d) => d.water > 0);
            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Activity summary fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    range: { days: range.days, from: range.from, to: range.to },
                    hasAnyData: anySteps !== null || anyWater !== null,
                    steps: {
                        today: { value: today.steps, goal: stepsGoal, percentOfGoal: percentOfGoal(today.steps, stepsGoal), goalMet: today.steps >= stepsGoal },
                        averagePerDay: average(stepDays.map((d) => d.steps)),
                        loggedDays: stepDays.length,
                        daysGoalMet: days.filter((d) => d.steps >= stepsGoal).length,
                        unit: "steps",
                    },
                    water: {
                        today: { value: today.water, goal: waterGoal, percentOfGoal: percentOfGoal(today.water, waterGoal), goalMet: today.water >= waterGoal },
                        averagePerDay: average(waterDays.map((d) => d.water)),
                        loggedDays: waterDays.length,
                        daysGoalMet: days.filter((d) => d.water >= waterGoal).length,
                        unit: "glasses",
                    },
                    daily: days,
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** One row per calendar day (newest first, days with no log show 0) with the percentage of each goal reached. */
    public async getActivityDaily(req: Request, res: Response): Promise<void> {
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
            const { page, limit } = query;
            const range = resolveRange(query.days ?? DEFAULT_ACTIVITY_DAYS);
            const stepsGoal = user.stepsGoal && user.stepsGoal > 0 ? user.stepsGoal : DEFAULT_STEPS_GOAL;
            const waterGoal = user.goalWaterIntake && user.goalWaterIntake > 0 ? user.goalWaterIntake : DEFAULT_WATER_GOAL_GLASSES;
            const days = (await this.loadDays({ userId: user._id, range })).reverse();

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Daily activity fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    range: { days: range.days, from: range.from, to: range.to },
                    days: days.slice((page - 1) * limit, page * limit).map((d) => ({
                        date: d.date,
                        steps: d.steps,
                        stepsGoal,
                        stepsPercentOfGoal: percentOfGoal(d.steps, stepsGoal),
                        stepsGoalMet: d.steps >= stepsGoal,
                        water: d.water,
                        waterGoal,
                        waterPercentOfGoal: percentOfGoal(d.water, waterGoal),
                        waterGoalMet: d.water >= waterGoal,
                    })),
                    pagination: paginate({ page, limit, totalItems: days.length }),
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Count and share of every mood in the range, the sentiment split, and the most recent entries with their notes. */
    public async getMoodSummary(req: Request, res: Response): Promise<void> {
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
            const [anyMood, logs] = await Promise.all([
                MoodLogDb.exists({ userId: user._id }),
                MoodLogDb.find({ userId: user._id, date: { $gte: range.from, $lte: range.to } }).sort({ date: -1, createdAt: -1 }).select("mood description date createdAt").lean() as Promise<tLog[]>,
            ]);

            const entries = logs.map(moodEntry);
            const total = entries.length;
            const share = (count: number): number => (total > 0 ? round((count / total) * 100, 1) : 0);
            const sentimentCount = (sentiment: tMoodSentiment): number => entries.filter((e) => e.sentiment === sentiment).length;

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Mood summary fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: {
                    range: { days: range.days, from: range.from, to: range.to },
                    hasAnyData: anyMood !== null,
                    totalEntries: total,
                    daysWithEntries: new Set(entries.map((e) => dayKey(e.loggedAt))).size,
                    distribution: Object.keys(cMoodSentiments).map((mood) => {
                        const count = entries.filter((e) => e.mood === mood).length;
                        return { mood, label: humanize(mood), sentiment: cMoodSentiments[mood], count, percentage: share(count) };
                    }),
                    sentiments: (["positive", "neutral", "negative"] as const).map((sentiment) => ({
                        sentiment,
                        count: sentimentCount(sentiment),
                        percentage: share(sentimentCount(sentiment)),
                    })),
                    recentEntries: entries.slice(0, RECENT_MOOD_LIMIT),
                },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /** Every mood entry with its note, newest first. */
    public async getMoodEntries(req: Request, res: Response): Promise<void> {
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
                MoodLogDb.countDocuments(filter),
                MoodLogDb.find(filter).sort({ date: -1, createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select("mood description date createdAt").lean() as Promise<tLog[]>,
            ]);

            reply(ctx, {
                status: eResponseStatus.SUCCESS,
                message: "Mood entries fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: { entries: logs.map(moodEntry), pagination: paginate({ page, limit, totalItems }) },
            });
        } catch (err: unknown) {
            fail(ctx, err);
        }
    }

    /**
     * Steps and water for each calendar day of the range, oldest first, zero where nothing was logged.
     * The app keeps one steps record per day (overwritten as the day goes on); water is the sum of the day's entries.
     */
    private async loadDays(args: { userId: Types.ObjectId | string; range: ReturnType<typeof resolveRange> }): Promise<iDay[]> {
        const { userId, range } = args;
        const [stepLogs, waterLogs] = await Promise.all([
            StepsLogDb.find({ userId, createdAt: { $gte: range.from, $lte: range.to } }).select("coveredSteps createdAt updatedAt").lean() as Promise<tLog[]>,
            WaterLogDb.find({ userId, date: { $gte: range.from, $lte: range.to } }).select("consumedWaterIntake date createdAt").lean() as Promise<tLog[]>,
        ]);

        const steps = new Map<string, { value: number; updatedAt: number }>();
        for (const log of stepLogs) {
            const key = dayKey(log.createdAt ?? new Date(0));
            const updatedAt = (log.updatedAt ?? log.createdAt ?? new Date(0)).getTime();
            const current = steps.get(key);
            if (!current || updatedAt > current.updatedAt) {
                steps.set(key, { value: log.coveredSteps ?? 0, updatedAt });
            }
        }
        const water = new Map<string, number>();
        for (const log of waterLogs) {
            const key = dayKey(log.date ?? log.createdAt ?? new Date(0));
            water.set(key, (water.get(key) ?? 0) + (log.consumedWaterIntake ?? 0));
        }
        return dayKeys(range).map((date) => ({ date, steps: steps.get(date)?.value ?? 0, water: water.get(date) ?? 0 }));
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
