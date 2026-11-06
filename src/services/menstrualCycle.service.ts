import { iMenstrualProfile, iPeriodLog } from "../interfaces/menstrual.interface";

const DAY_MS = 24 * 60 * 60 * 1000;
// Dates are calendar days in India (UTC+05:30), like the user app: a day stored as 18:30Z or as 00:00Z is the same day.
const APP_UTC_OFFSET_MS = 330 * 60 * 1000;
const MIN_CYCLE_DAYS = 15;
const MAX_CYCLE_DAYS = 60;
const LUTEAL_DAYS = 14;
const TIMELINE_CYCLES = 3;

export type tCyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";
export type tCycleStatus = "on_track" | "due_today" | "late";

export interface iPhaseSpan {
    phase: tCyclePhase;
    label: string;
    startDay: number;
    endDay: number;
}

export interface iCycleCalculation {
    lastPeriodStart: string;
    lastPeriodSource: "period_log" | "profile";
    cycleLengthDays: number;
    periodLengthDays: number;
    cycleDay: number;
    phase: iPhaseSpan;
    phases: iPhaseSpan[];
    status: tCycleStatus;
    daysOverdue: number;
    nextPeriod: { date: string; inDays: number };
    timeline: { start: string; end: string; isPredicted: boolean }[];
}

const PHASE_LABELS: Record<tCyclePhase, string> = {
    menstrual: "Period",
    follicular: "Follicular",
    ovulation: "Ovulation window",
    luteal: "Luteal",
};

/** The calendar day of `date` in India, as the UTC midnight that day starts at. */
export function calendarDay(date: Date): number {
    const shifted = new Date(date.getTime() + APP_UTC_OFFSET_MS);
    return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

/** YYYY-MM-DD of a value made by calendarDay. */
export function dateString(day: number): string {
    return new Date(day).toISOString().slice(0, 10);
}

/** Length of one logged period in days, when the log says how long it lasted. */
export function loggedPeriodLength(log: Pick<iPeriodLog, "periodStartDate" | "periodEndDate" | "durationDays">): number | null {
    if (log.durationDays && log.durationDays > 0) {
        return log.durationDays;
    }
    if (log.periodEndDate) {
        return Math.max(1, Math.round((calendarDay(log.periodEndDate) - calendarDay(log.periodStartDate)) / DAY_MS) + 1);
    }
    return null;
}

/**
 * Cycle details the way the user app works them out: the latest logged period (else the profile) is the
 * start, and logged periods refine the cycle and period length. Phases follow the admin design: ovulation
 * is 14 days before the next period, with a three-day window around it.
 */
export default class MenstrualCycleService {
    public static instance: MenstrualCycleService = new MenstrualCycleService();
    private constructor() {}

    /** `logs` newest first. */
    public calculate(args: { profile: iMenstrualProfile; logs: iPeriodLog[]; now?: Date }): iCycleCalculation {
        const { profile, logs, now = new Date() } = args;
        const latest = logs.length > 0 ? logs[0] : null;
        const lastStart = calendarDay(latest?.periodStartDate ?? profile.lastPeriodStartDate);
        const periodLengthDays = this.periodLength({ profile, logs });
        const cycleLengthDays = this.cycleLength({ profile, logs });

        const today = calendarDay(now);
        const cycleDay = Math.max(1, Math.floor((today - lastStart) / DAY_MS) + 1);
        const next = lastStart + cycleLengthDays * DAY_MS;
        const daysToNext = Math.round((next - today) / DAY_MS);
        const phases = this.phases({ cycleLengthDays, periodLengthDays });
        const phase = phases.find((p) => cycleDay >= p.startDay && cycleDay <= p.endDay) ?? phases[phases.length - 1];

        let status: tCycleStatus = "on_track";
        if (daysToNext < 0) {
            status = "late";
        } else if (daysToNext === 0) {
            status = "due_today";
        }
        return {
            lastPeriodStart: dateString(lastStart),
            lastPeriodSource: latest ? "period_log" : "profile",
            cycleLengthDays,
            periodLengthDays,
            cycleDay,
            phase,
            phases,
            status,
            daysOverdue: Math.max(0, -daysToNext),
            nextPeriod: { date: dateString(next), inDays: Math.max(0, daysToNext) },
            timeline: Array.from({ length: TIMELINE_CYCLES }, (_, k) => {
                const start = lastStart + k * cycleLengthDays * DAY_MS;
                return { start: dateString(start), end: dateString(start + (cycleLengthDays - 1) * DAY_MS), isPredicted: k > 0 };
            }),
        };
    }

    private phases(args: { cycleLengthDays: number; periodLengthDays: number }): iPhaseSpan[] {
        const { cycleLengthDays: length, periodLengthDays: period } = args;
        const ovulationDay = length - LUTEAL_DAYS;
        const windowStart = Math.max(period + 1, ovulationDay - 1);
        const windowEnd = Math.min(length, Math.max(windowStart, ovulationDay + 1));
        const spans: iPhaseSpan[] = [
            { phase: "menstrual", label: PHASE_LABELS.menstrual, startDay: 1, endDay: Math.min(period, length) },
            { phase: "follicular", label: PHASE_LABELS.follicular, startDay: period + 1, endDay: windowStart - 1 },
            { phase: "ovulation", label: PHASE_LABELS.ovulation, startDay: windowStart, endDay: windowEnd },
            { phase: "luteal", label: PHASE_LABELS.luteal, startDay: windowEnd + 1, endDay: length },
        ];
        return spans.filter((p) => p.startDay <= p.endDay);
    }

    private periodLength(args: { profile: iMenstrualProfile; logs: iPeriodLog[] }): number {
        const { profile, logs } = args;
        const fallback = profile.typicalPeriodLength || 5;
        if (logs.length === 0) {
            return fallback;
        }
        const own = loggedPeriodLength(logs[0]);
        if (own) {
            return own;
        }
        const lengths = logs.map(loggedPeriodLength).filter((n): n is number => n !== null);
        return lengths.length > 0 ? Math.round(lengths.reduce((sum, n) => sum + n, 0) / lengths.length) : fallback;
    }

    private cycleLength(args: { profile: iMenstrualProfile; logs: iPeriodLog[] }): number {
        const { profile, logs } = args;
        const fallback = profile.typicalCycleLength || 28;
        const intervals: number[] = [];
        for (let i = 0; i < logs.length - 1; i++) {
            intervals.push(Math.round((calendarDay(logs[i].periodStartDate) - calendarDay(logs[i + 1].periodStartDate)) / DAY_MS));
        }
        // With one log, the gap from the profile's start date is the only interval there is
        if (logs.length === 1 && calendarDay(logs[0].periodStartDate) > calendarDay(profile.lastPeriodStartDate)) {
            intervals.push(Math.round((calendarDay(logs[0].periodStartDate) - calendarDay(profile.lastPeriodStartDate)) / DAY_MS));
        }
        const valid = intervals.filter((n) => n >= MIN_CYCLE_DAYS && n <= MAX_CYCLE_DAYS);
        return valid.length > 0 ? Math.round(valid.reduce((sum, n) => sum + n, 0) / valid.length) : fallback;
    }
}
