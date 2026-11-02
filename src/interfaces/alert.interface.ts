import { Types } from "mongoose";

export type tAlertType = "heartRate" | "bloodPressure" | "bloodSugar";
export type tAlertSeverity = "critical" | "high";

export interface iCriticalAlertsQuery {
    page: number;
    severity: "all" | tAlertSeverity;
    days: number;
}

export interface iAlertRow {
    _id: Types.ObjectId;
    type: tAlertType;
    severity: tAlertSeverity;
    loggedAt: Date;
    beatsPerMinute?: number;
    systolic?: number;
    diastolic?: number;
    bloodSugar?: number;
    mealContext?: string;
    user: { _id: Types.ObjectId; fullName?: string; mobile?: string; email?: string };
}

export interface iAlertFacets {
    items: iAlertRow[];
    total: { n: number }[];
}

export interface iCriticalAlert {
    alertId: string;
    userId: string;
    fullName: string | null;
    mobile: string | null;
    email: string | null;
    type: tAlertType;
    label: string;
    context: string | null;
    severity: tAlertSeverity;
    value: number | { systolic: number; diastolic: number };
    unit: string;
    displayValue: string;
    loggedAt: string;
}

export interface iCriticalAlerts {
    alerts: iCriticalAlert[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}
