import { Types } from "mongoose";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";
import { iExerciseLevelDetails } from "./exercise.interface";

export interface iWorkoutPlanExercise {
    exerciseId?: Types.ObjectId | string;
    name: string;
    description?: string;
    focusPart: eFocusPart;
    exerciseType: eExerciseType;
    equipmentRequired: string;
    imageUrl?: string;
    selectedLevel: iExerciseLevelDetails;
    workTime: number; // in seconds (sets * durationPerSet)
    note?: string; // tip or instruction e.g. "Warm-up set. Full range."
}

export interface iWorkoutPlan {
    _id?: Types.ObjectId | string;
    name: string;
    subtitle: string;
    description: string;
    exerciseFor: eFocusPart;
    level: eExerciseLevel;
    focusParts: eFocusPart[];
    totalExercises: number;
    totalDuration: number; // total time in seconds
    totalCaloriesBurn: number; // in kcal
    exercises: iWorkoutPlanExercise[];
    isActive: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateWorkoutPlanExercisePayload {
    _id?: string;
    exerciseId?: string;
    name: string;
    description?: string;
    focusPart: eFocusPart;
    exerciseType: eExerciseType;
    equipmentRequired?: string;
    imageUrl?: string;
    selectedLevel: iExerciseLevelDetails;
    note?: string;
}

export interface iCreateWorkoutPlanPayload {
    name: string;
    description: string;
    exerciseFor: eFocusPart;
    exercises: iCreateWorkoutPlanExercisePayload[];
    isActive?: boolean;
    level?: eExerciseLevel;
}
