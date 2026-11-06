import { Types } from "mongoose";

// Read-only mirrors of the user app's menstrual collections (only the fields the admin panel reads).
export interface iMenstrualProfile {
    userId: Types.ObjectId;
    lastPeriodStartDate: Date;
    typicalCycleLength: number;
    typicalPeriodLength: number;
    cycleRegularity: string;
    trackingStartedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iPeriodLog {
    userId: Types.ObjectId;
    periodStartDate: Date;
    periodEndDate?: Date;
    durationDays?: number;
    flowIntensity: string;
    symptoms: string[];
    notes?: string;
    createdAt?: Date;
}

export interface iMenstrualInsight {
    userId: Types.ObjectId;
    dateKey: string;
    phase: string;
    status: string;
    tips: string[];
    remedies: string[];
    createdAt?: Date;
}
