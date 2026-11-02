export type tTelemetryMetric = "steps" | "water" | "heartRate" | "bloodPressure" | "bloodSugar" | "mood";

export interface iTelemetryQuery {
    range: 7 | 30 | 90;
    page: number;
    limit: number;
}

export interface iTelemetryCount {
    users: number;
    logs: number;
}

export interface iTelemetryDay extends Record<tTelemetryMetric, iTelemetryCount> {
    date: string;
}

export interface iTelemetrySummary {
    totalLogs: number;
    uniqueUsers: number;
    previousTotalLogs: number;
    previousUniqueUsers: number;
    logsChangePercent: number | null;
    usersChangePercent: number | null;
}

export interface iTelemetryActivity {
    range: number;
    periodStart: string;
    periodEnd: string;
    summary: Record<tTelemetryMetric, iTelemetrySummary>;
    data: iTelemetryDay[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}
