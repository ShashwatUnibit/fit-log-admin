import type { Request, Response } from "express";
import type { Model, PipelineStage, QueryFilter } from "mongoose";
import { ALERTS_PAGE_SIZE, cAlertThresholds } from "../consts/alertThreshold.const";
import { iAlertFacets, iAlertRow, iCriticalAlert, iCriticalAlerts, iCriticalAlertsQuery, tAlertSeverity } from "../interfaces/alert.interface";
import { BloodPressureLogDb as BpAlertDb, BloodSugarLogDb as BsAlertDb } from "../db/mongo/healthLog.mongo";
import UserDb from "../db/mongo/users.mongo";
import GoalDb from "../db/mongo/goals.mongo";
import { iTopGoalFacets, iTopGoals } from "../interfaces/goal.interface";
import { BloodPressureLogDb, BloodSugarLogDb, HeartRateLogDb, MoodLogDb, StepsLogDb, WaterLogDb } from "../db/mongo/healthLog.mongo";
import { iHealthLog } from "../interfaces/healthLog.interface";
import { iTelemetryActivity, iTelemetryCount, iTelemetryDay, iTelemetryQuery, iTelemetrySummary, tTelemetryMetric } from "../interfaces/telemetry.interface";
import DashboardValidator from "../validators/dashboard.validator";
import { eDevice, eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iPlatformDistribution, iTrendPoint, iUserDashboardStats, iUserStatCard } from "../interfaces/dashboard.interface";
import { iUsers } from "../interfaces/user.interface";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const TREND_DAYS = 7;
const PLATFORMS: string[] = [eDevice.IOS, eDevice.ANDROID, eDevice.WEB];
const NOT_DELETED: QueryFilter<iUsers> = { isDeleted: { $ne: true } };

type tUnionStage = Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out>;

interface iTelemetrySource {
    key: tTelemetryMetric;
    model: Model<iHealthLog>;
    dateField: "date" | "createdAt";
}
interface iTelemetryFacets {
    daily: { _id: string; users: number; logs: number }[];
    uniqueCurrent: { n: number }[];
    uniquePrevious: { n: number }[];
}
const TELEMETRY_SOURCES: iTelemetrySource[] = [
    { key: "steps", model: StepsLogDb, dateField: "createdAt" },
    { key: "water", model: WaterLogDb, dateField: "date" },
    { key: "heartRate", model: HeartRateLogDb, dateField: "createdAt" },
    { key: "bloodPressure", model: BloodPressureLogDb, dateField: "date" },
    { key: "bloodSugar", model: BloodSugarLogDb, dateField: "date" },
    { key: "mood", model: MoodLogDb, dateField: "date" },
];

export default class DashboardController {
    public static instance: DashboardController = new DashboardController();
    private constructor() {}

    public async getUserStats(req: Request, res: Response): Promise<void> {
        try {
            const now = new Date();
            const startOfToday = this.startOfDayIst(now);

            const [totalUsers, incompleteCount, activeCount, premiumUsers, googleCount] = await Promise.all([
                this.buildCard({ filter: NOT_DELETED, now }),
                UserDb.countDocuments({ ...NOT_DELETED, isRegistrationCompleted: false }),
                UserDb.countDocuments({ ...NOT_DELETED, updatedAt: { $gte: startOfToday } }),
                this.buildCard({ filter: { ...NOT_DELETED, isPremium: true }, now }),
                UserDb.countDocuments({ ...NOT_DELETED, email: { $type: "string", $ne: "" } }),
            ]);

            const data: iUserDashboardStats = {
                totalUsers: { ...totalUsers, viaOtp: totalUsers.count - googleCount, viaGoogle: googleCount },
                incompleteProfileUsers: { count: incompleteCount },
                activeToday: {
                    count: activeCount,
                    engagementPercent: totalUsers.count ? this.round((activeCount / totalUsers.count) * 100) : 0,
                },
                premiumUsers,
            };

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "User dashboard stats fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
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

    public async getPlatformDistribution(req: Request, res: Response): Promise<void> {
        try {
            const rows = await UserDb.aggregate<{ _id: { platform: string; appVersion: string | null }; users: number }>([
                { $match: { ...NOT_DELETED, platform: { $type: "string" } } },
                { $group: { _id: { platform: { $toLower: "$platform" }, appVersion: "$appVersion" }, users: { $sum: 1 } } },
            ]);

            const byPlatform = new Map<string, { users: number; latestVersion: string | null }>();
            rows.forEach((row) => {
                const { platform, appVersion } = row._id;
                if (!PLATFORMS.includes(platform)) {
                    return;
                }
                const entry = byPlatform.get(platform) ?? { users: 0, latestVersion: null };
                entry.users += row.users;
                if (appVersion && (!entry.latestVersion || this.compareVersions(appVersion, entry.latestVersion) > 0)) {
                    entry.latestVersion = appVersion;
                }
                byPlatform.set(platform, entry);
            });

            const totalDevices = [...byPlatform.values()].reduce((sum, p) => sum + p.users, 0);
            const data: iPlatformDistribution = {
                totalDevices,
                platforms: [...byPlatform.entries()]
                    .map(([platform, p]) => ({
                        platform,
                        users: p.users,
                        percent: totalDevices ? this.round((p.users / totalDevices) * 100) : 0,
                        latestVersion: p.latestVersion,
                    }))
                    .sort((a, b) => b.users - a.users),
            };

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Platform distribution fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
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

    /** Numeric dotted-version compare ("3.10.0" > "3.9.2"); returns >0 when a is newer. */
    private compareVersions(a: string, b: string): number {
        const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
        const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
            if (diff !== 0) {
                return diff;
            }
        }
        return 0;
    }

    public async getTopGoals(req: Request, res: Response): Promise<void> {
        const result = DashboardValidator.instance.topGoalsQuerySchema.validate(req.query);
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
            const { days, limit } = result.value;
            const since = new Date(Date.now() - days * DAY_MS);

            const [facets] = await UserDb.aggregate<iTopGoalFacets>([
                { $match: { ...NOT_DELETED, goal: { $type: "objectId" }, createdAt: { $gte: since } } },
                { $group: { _id: "$goal", users: { $sum: 1 } } },
                { $lookup: { from: GoalDb.collection.name, localField: "_id", foreignField: "_id", as: "goal" } },
                { $unwind: "$goal" },
                { $sort: { users: -1, _id: 1 } },
                {
                    $facet: {
                        top: [{ $limit: limit }],
                        total: [{ $group: { _id: null, n: { $sum: "$users" } } }],
                    },
                },
            ]);

            const totalUsersWithGoal = facets.total[0]?.n ?? 0;
            const maxUsers = facets.top[0]?.users ?? 0;
            const data: iTopGoals = {
                days,
                totalUsersWithGoal,
                goals: facets.top.map((row, idx) => ({
                    rank: idx + 1,
                    goalId: row._id.toString(),
                    goalName: row.goal.goalName ?? "",
                    goalIcon: row.goal.goalIcon ?? null,
                    users: row.users,
                    sharePercent: totalUsersWithGoal ? this.round((row.users / totalUsersWithGoal) * 100) : 0,
                    barPercent: maxUsers ? this.round((row.users / maxUsers) * 100) : 0,
                })),
            };

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Top onboarding goals fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
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

    public async getCriticalAlerts(req: Request, res: Response): Promise<void> {
        const result = DashboardValidator.instance.criticalAlertsQuerySchema.validate(req.query);
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
            const data = await this.buildCriticalAlerts(result.value);
            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Critical alerts fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
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

    /** One merged, time-sorted feed of abnormal heart-rate / blood-pressure / blood-sugar readings (paginated in the DB). */
    private async buildCriticalAlerts(query: iCriticalAlertsQuery): Promise<iCriticalAlerts> {
        const { page, severity, days } = query;
        const since = new Date(Date.now() - days * DAY_MS);
        const severities: tAlertSeverity[] = severity === "all" ? ["critical", "high"] : [severity];
        const t = cAlertThresholds;

        const stages = (params: { type: string; fields: Record<string, 1>; critical: object; high: object }): tUnionStage[] => [
            { $match: { createdAt: { $gte: since } } },
            {
                $project: {
                    userId: 1,
                    loggedAt: "$createdAt",
                    type: { $literal: params.type },
                    ...params.fields,
                    severity: { $switch: { branches: [{ case: params.critical, then: "critical" }, { case: params.high, then: "high" }], default: "normal" } },
                },
            },
            { $match: { severity: { $in: severities } } },
        ];

        const hrStages = stages({
            type: "heartRate",
            fields: { beatsPerMinute: 1 },
            critical: { $or: [{ $lt: ["$beatsPerMinute", t.heartRate.criticalLow] }, { $gt: ["$beatsPerMinute", t.heartRate.criticalHigh] }] },
            high: { $or: [{ $lt: ["$beatsPerMinute", t.heartRate.highLow] }, { $gt: ["$beatsPerMinute", t.heartRate.highHigh] }] },
        });
        const bpStages = stages({
            type: "bloodPressure",
            fields: { systolic: 1, diastolic: 1 },
            critical: {
                $or: [
                    { $gte: ["$systolic", t.bloodPressure.criticalSystolicHigh] },
                    { $gte: ["$diastolic", t.bloodPressure.criticalDiastolicHigh] },
                    { $lt: ["$systolic", t.bloodPressure.criticalSystolicLow] },
                    { $lt: ["$diastolic", t.bloodPressure.criticalDiastolicLow] },
                ],
            },
            high: {
                $or: [
                    { $gte: ["$systolic", t.bloodPressure.highSystolicHigh] },
                    { $gte: ["$diastolic", t.bloodPressure.highDiastolicHigh] },
                    { $lt: ["$systolic", t.bloodPressure.highSystolicLow] },
                    { $lt: ["$diastolic", t.bloodPressure.highDiastolicLow] },
                ],
            },
        });
        const isFasting = { $in: ["$mealContext", t.bloodSugar.fastingContexts] };
        const bsStages = stages({
            type: "bloodSugar",
            fields: { bloodSugar: 1, mealContext: 1 },
            critical: {
                $or: [
                    { $lt: ["$bloodSugar", t.bloodSugar.criticalLow] },
                    { $and: [isFasting, { $gte: ["$bloodSugar", t.bloodSugar.criticalFastingHigh] }] },
                    { $gte: ["$bloodSugar", t.bloodSugar.criticalPostMealHigh] },
                ],
            },
            high: {
                $or: [
                    { $lt: ["$bloodSugar", t.bloodSugar.highLow] },
                    { $and: [isFasting, { $gte: ["$bloodSugar", t.bloodSugar.highFastingHigh] }] },
                    { $gte: ["$bloodSugar", t.bloodSugar.highPostMealHigh] },
                ],
            },
        });

        const [facets] = await HeartRateLogDb.aggregate<iAlertFacets>([
            ...hrStages,
            { $unionWith: { coll: BpAlertDb.collection.name, pipeline: bpStages } },
            { $unionWith: { coll: BsAlertDb.collection.name, pipeline: bsStages } },
            { $lookup: { from: UserDb.collection.name, localField: "userId", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            { $match: { "user.isDeleted": { $ne: true } } },
            { $sort: { loggedAt: -1, _id: -1 } },
            {
                $facet: {
                    items: [{ $skip: (page - 1) * ALERTS_PAGE_SIZE }, { $limit: ALERTS_PAGE_SIZE }],
                    total: [{ $count: "n" }],
                },
            },
        ]);

        const totalItems = facets.total[0]?.n ?? 0;
        return {
            alerts: facets.items.map((row) => this.toAlert(row)),
            pagination: { page, limit: ALERTS_PAGE_SIZE, totalItems, totalPages: Math.ceil(totalItems / ALERTS_PAGE_SIZE) },
        };
    }

    private toAlert(row: iAlertRow): iCriticalAlert {
        const base = {
            alertId: row._id.toString(),
            userId: row.user._id.toString(),
            fullName: row.user.fullName ?? null,
            mobile: row.user.mobile ?? null,
            email: row.user.email ?? null,
            severity: row.severity,
            loggedAt: row.loggedAt.toISOString(),
        };
        const t = cAlertThresholds;

        if (row.type === "bloodSugar") {
            const value = row.bloodSugar ?? 0;
            const context = row.mealContext ? row.mealContext.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : null;
            return { ...base, type: "bloodSugar", label: "Blood sugar", context, value, unit: "mg/dL", displayValue: `${value} mg/dL` };
        }
        if (row.type === "bloodPressure") {
            const systolic = row.systolic ?? 0;
            const diastolic = row.diastolic ?? 0;
            let context = "Low blood pressure";
            if (systolic >= t.bloodPressure.criticalSystolicHigh || diastolic >= t.bloodPressure.criticalDiastolicHigh) {
                context = "Hypertensive crisis";
            } else if (systolic >= t.bloodPressure.highSystolicHigh || diastolic >= t.bloodPressure.highDiastolicHigh) {
                context = "Grade 2";
            }
            return { ...base, type: "bloodPressure", label: "Blood pressure", context, value: { systolic, diastolic }, unit: "mmHg", displayValue: `${systolic} / ${diastolic}` };
        }
        const bpm = row.beatsPerMinute ?? 0;
        const context = bpm < t.heartRate.highLow ? "Bradycardia" : "Tachycardia";
        return { ...base, type: "heartRate", label: "Heart rate", context, value: bpm, unit: "bpm", displayValue: `${bpm} bpm` };
    }

    public async getTelemetryActivity(req: Request, res: Response): Promise<void> {
        const result = DashboardValidator.instance.telemetryQuerySchema.validate(req.query);
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
            const data = await this.buildTelemetryActivity(result.value);
            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Telemetry activity fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
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

    /**
     * Current period = last `range` IST days including today; previous period = the `range` days before it.
     * Daily rows are paginated; the summary always covers the whole period.
     */
    private async buildTelemetryActivity(query: iTelemetryQuery): Promise<iTelemetryActivity> {
        const { range, page, limit } = query;
        const todayStart = this.startOfDayIst(new Date());
        const periodStart = new Date(todayStart.getTime() - (range - 1) * DAY_MS);
        const previousStart = new Date(periodStart.getTime() - range * DAY_MS);
        const periodEnd = new Date(todayStart.getTime() + DAY_MS);

        const facets = await Promise.all(
            TELEMETRY_SOURCES.map((source) => this.aggregateSource({ source, previousStart, periodStart, periodEnd }))
        );

        const dayKeys = this.dayKeys(periodStart, range);
        const previousKeys = this.dayKeys(previousStart, range);
        const pageKeys = dayKeys.slice((page - 1) * limit, page * limit);

        const summary = {} as Record<tTelemetryMetric, iTelemetrySummary>;
        const dailyMaps = new Map<tTelemetryMetric, Map<string, iTelemetryCount>>();
        TELEMETRY_SOURCES.forEach((source, idx) => {
            const { daily, uniqueCurrent, uniquePrevious } = facets[idx];
            const byDay = new Map(daily.map((d) => [d._id, { users: d.users, logs: d.logs }]));
            dailyMaps.set(source.key, byDay);

            const sumLogs = (keys: string[]): number => keys.reduce((sum, k) => sum + (byDay.get(k)?.logs ?? 0), 0);
            const totalLogs = sumLogs(dayKeys);
            const previousTotalLogs = sumLogs(previousKeys);
            const uniqueUsers = uniqueCurrent[0]?.n ?? 0;
            const previousUniqueUsers = uniquePrevious[0]?.n ?? 0;
            summary[source.key] = {
                totalLogs,
                uniqueUsers,
                previousTotalLogs,
                previousUniqueUsers,
                logsChangePercent: this.periodChange(totalLogs, previousTotalLogs),
                usersChangePercent: this.periodChange(uniqueUsers, previousUniqueUsers),
            };
        });

        const data: iTelemetryDay[] = pageKeys.map((date) => {
            const row = { date } as iTelemetryDay;
            TELEMETRY_SOURCES.forEach((source) => {
                row[source.key] = dailyMaps.get(source.key)?.get(date) ?? { users: 0, logs: 0 };
            });
            return row;
        });

        return {
            range,
            periodStart: dayKeys[0],
            periodEnd: dayKeys[dayKeys.length - 1],
            summary,
            data,
            pagination: { page, limit, totalItems: range, totalPages: Math.ceil(range / limit) },
        };
    }

    private async aggregateSource(params: { source: iTelemetrySource; previousStart: Date; periodStart: Date; periodEnd: Date }): Promise<iTelemetryFacets> {
        const { source, previousStart, periodStart, periodEnd } = params;
        const field = source.dateField;
        const [facets] = await source.model.aggregate<iTelemetryFacets>([
            { $match: { [field]: { $gte: previousStart, $lt: periodEnd } } },
            {
                $facet: {
                    daily: [
                        { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: "+05:30" } }, userId: "$userId" }, logs: { $sum: 1 } } },
                        { $group: { _id: "$_id.day", users: { $sum: 1 }, logs: { $sum: "$logs" } } },
                    ],
                    uniqueCurrent: [{ $match: { [field]: { $gte: periodStart } } }, { $group: { _id: "$userId" } }, { $count: "n" }],
                    uniquePrevious: [{ $match: { [field]: { $lt: periodStart } } }, { $group: { _id: "$userId" } }, { $count: "n" }],
                },
            },
        ]);
        return facets;
    }

    private dayKeys(start: Date, days: number): string[] {
        return Array.from({ length: days }, (_, i) => new Date(start.getTime() + i * DAY_MS + IST_OFFSET_MS).toISOString().slice(0, 10));
    }

    /** (current - previous) / previous * 100; null when there is no previous data to compare against. */
    private periodChange(current: number, previous: number): number | null {
        if (previous === 0) {
            return current === 0 ? 0 : null;
        }
        return this.round(((current - previous) / previous) * 100);
    }

    /** Count now, change vs 7 days ago, and a cumulative per-day trend (by createdAt) for the last 7 days. */
    private async buildCard(params: { filter: QueryFilter<iUsers>; now: Date }): Promise<iUserStatCard> {
        const { filter, now } = params;
        const trendStart = new Date(this.startOfDayIst(now).getTime() - (TREND_DAYS - 1) * DAY_MS);
        const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

        const [count, countWeekAgo, baseline, daily] = await Promise.all([
            UserDb.countDocuments(filter),
            UserDb.countDocuments({ ...filter, createdAt: { $lt: weekAgo } }),
            UserDb.countDocuments({ ...filter, createdAt: { $lt: trendStart } }),
            UserDb.aggregate<{ _id: string; count: number }>([
                { $match: { ...filter, createdAt: { $gte: trendStart } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } }, count: { $sum: 1 } } },
            ]),
        ]);

        const perDay = new Map(daily.map((d) => [d._id, d.count]));
        let running = baseline;
        const trend: iTrendPoint[] = [];
        for (let i = 0; i < TREND_DAYS; i++) {
            const date = new Date(trendStart.getTime() + i * DAY_MS + IST_OFFSET_MS).toISOString().slice(0, 10);
            running += perDay.get(date) ?? 0;
            trend.push({ date, count: running });
        }

        return { count, changePercent: this.percentChange(count, countWeekAgo), trend };
    }

    private startOfDayIst(date: Date): Date {
        const istMs = date.getTime() + IST_OFFSET_MS;
        return new Date(istMs - (istMs % DAY_MS) - IST_OFFSET_MS);
    }

    private percentChange(current: number, previous: number): number {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return this.round(((current - previous) / previous) * 100);
    }

    private round(value: number): number {
        return Math.round(value * 10) / 10;
    }
}
