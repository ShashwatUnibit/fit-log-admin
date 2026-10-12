import { Schema, Types } from "mongoose";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";

export interface iHealthProfilePrecaution {
    title: string;
    description: string;
    conditions: string[];
}

export interface iPrimaryFocusMuscle {
    name: string;
    anatomicalName: string;
}

export interface iTargetMuscles {
    primaryFocus: iPrimaryFocusMuscle;
    secondaryFocus: string[];
}

export interface iStepByStepInstruction {
    stepNumber: number;
    title: string;
    description: string;
    tip?: string;
}

export interface iCommonMistakeCorrection {
    avoid: string;
    fix: string;
    why: string;
}

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
    _id?: Schema.Types.ObjectId | Types.ObjectId | string;
    name: string;
    description?: string;
    focusPart: eFocusPart;
    exerciseType: eExerciseType;
    equipmentRequired: string;
    image?: string;
    video?: string;
    healthProfilePrecaution?: iHealthProfilePrecaution;
    targetMuscles?: iTargetMuscles;
    stepByStepInstructions?: iStepByStepInstruction[];
    commonMistakesAndCorrections?: iCommonMistakeCorrection[];
    breathingPattern?: string;
    levels: iExerciseLevelDetails[];
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateExercisePayload {
    name: string;
    focusPart: eFocusPart;
    description?: string;
    imageUrl?: string;
    image?: string;
    videoUrl?: string;
    video?: string;
    equipmentRequired?: string;
    exerciseType?: eExerciseType;
    healthProfilePrecaution?: iHealthProfilePrecaution;
    targetMuscles?: iTargetMuscles;
    stepByStepInstructions?: iStepByStepInstruction[];
    commonMistakesAndCorrections?: iCommonMistakeCorrection[];
    breathingPattern?: string;
    levels?: iExerciseLevelDetails[];
}

export interface iGetExercisesQuery {
    focusPart?: eFocusPart;
    exerciseType?: eExerciseType;
    exerciseLevel?: eExerciseLevel;
    level?: eExerciseLevel;
    equipmentRequired?: string;
    totalTimeToComplete?: number;
    page?: number;
    limit?: number;
}