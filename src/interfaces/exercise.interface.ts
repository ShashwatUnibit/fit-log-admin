import { Schema } from "mongoose";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";

export interface iExerciseLevelDetails {
    level: eExerciseLevel;
    repetition: number;
    sets: number;
    restTime: number;
    caloriesBurn: number;
    durationPerSet: number;
    totalTimeToComplete: number;
}

export interface iExercise {
    _id?: Schema.Types.ObjectId | string;
    name: string;
    description?: string;
    focusPart: eFocusPart;
    exerciseType: eExerciseType;
    equipmentRequired: string;
    imageUrl?: string;
    levels: iExerciseLevelDetails[];
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateExercisePayload {
    name: string;
    description?: string;
    focusPart: eFocusPart;
    imageUrl?: string;
}

export interface iGetExercisesQuery {
    focusPart?: eFocusPart;
    exerciseType?: eExerciseType;
    exerciseLevel?: eExerciseLevel;
    page?: number;
    limit?: number;
}