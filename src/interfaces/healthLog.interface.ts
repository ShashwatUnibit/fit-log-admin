import { Types } from "mongoose";

export interface iHealthLog {
    userId: Types.ObjectId;
    date?: Date;
    createdAt?: Date;
    coveredSteps?: number;
    consumedWaterIntake?: number;
    beatsPerMinute?: number;
    systolic?: number;
    diastolic?: number;
    bloodSugar?: number;
    mealContext?: string;
    mood?: string;
    description?: string;
    updatedAt?: Date;
}
