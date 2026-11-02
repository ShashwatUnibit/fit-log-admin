import { Types } from "mongoose";

export interface iPlanExerciseLevel {
    level?: string;
    repetition?: number;
    sets?: number;
    restTime?: number;
    caloriesBurn?: number;
    durationPerSet?: number;
    totalTimeToComplete?: number;
}

export interface iPlanExercise {
    exerciseId?: Types.ObjectId;
    name?: string;
    focusPart?: string;
    exerciseType?: string;
    equipmentRequired?: string;
    imageUrl?: string;
    video?: string;
    isCompleted?: boolean;
    selectedLevel?: iPlanExerciseLevel;
}

export interface iPlanDay {
    dayNumber?: number;
    dayName?: string;
    isRestDay?: boolean;
    focusArea?: string;
    totalDuration?: number;
    totalCaloriesBurn?: number;
    exercises?: iPlanExercise[];
}

export interface iUserWorkoutPlan {
    _id?: Types.ObjectId;
    userId: Types.ObjectId;
    name?: string;
    dailyPlan?: iPlanDay[];
    totalExercises?: number;
    totalDuration?: number;
    totalCaloriesBurn?: number;
    startDate?: Date;
    endDate?: Date;
    daysCount?: number;
    blockNumber?: number;
    daysPassedInProgram?: number;
    daysRemainingInProgram?: number;
    totalProgramDays?: number;
    isActive?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
