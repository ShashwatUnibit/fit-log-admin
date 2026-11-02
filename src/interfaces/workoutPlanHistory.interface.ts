export interface iWorkoutPlanHistoryQuery {
    page: number;
    limit: number;
}

export interface iWorkoutExerciseView {
    order: number;
    exerciseId: string | null;
    name: string | null;
    focusPart: string | null;
    exerciseType: string | null;
    equipmentRequired: string | null;
    imageUrl: string | null;
    video: string | null;
    isCompleted: boolean;
    level: string | null;
    sets: number | null;
    reps: number | null;
    restTime: number | null;
    caloriesBurn: number | null;
    durationPerSet: number | null;
    totalTimeToComplete: number | null;
}

export interface iWorkoutDayView {
    dayNumber: number;
    dayName: string | null;
    isRestDay: boolean;
    focusArea: string | null;
    totalDuration: number;
    totalCaloriesBurn: number;
    exercises: iWorkoutExerciseView[];
}

export interface iWorkoutPlanView {
    workoutPlanId: string;
    userId: string;
    name: string | null;
    blockNumber: number | null;
    isActive: boolean;
    status: "Active" | "Inactive";
    startDate: Date | null;
    endDate: Date | null;
    totalExercises: number;
    totalDuration: number;
    totalCaloriesBurn: number;
    daysCount: number | null;
    daysPassedInProgram: number | null;
    daysRemainingInProgram: number | null;
    totalProgramDays: number | null;
    createdAt: Date | null;
    dailyPlan: iWorkoutDayView[];
}

export interface iWorkoutPlanHistory {
    summary: { totalPlans: number; activePlans: number };
    plans: iWorkoutPlanView[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}
