export interface iNamedRef {
    id: string;
    name: string | null;
}

export interface iVitalReading {
    status: string;
    loggedAt: Date;
}

export interface iDailyProgress {
    value: number;
    goal: number;
    percentOfGoal: number;
    asOf: Date;
}

export interface iUserVitals {
    bloodPressure: (iVitalReading & { systolic: number; diastolic: number; unit: "mmHg" }) | null;
    bloodSugar: (iVitalReading & { value: number; unit: "mg/dL"; mealContext: string | null; mealContextLabel: string | null }) | null;
    heartRate: (iVitalReading & { value: number; unit: "bpm" }) | null;
    stepsToday: iDailyProgress & { unit: "steps" };
    waterToday: iDailyProgress & { unit: "glasses" };
    latestMood: { mood: string; label: string; sentiment: "positive" | "neutral" | "negative" | "unknown"; loggedAt: Date } | null;
}

export interface iUserOverview {
    header: {
        userId: string;
        fullName: string | null;
        email: string | null;
        mobile: string | null;
        profilePic: string | null;
        isActive: boolean;
        status: "Active" | "Inactive";
        isPremium: boolean;
        plan: "VIP Premium" | "Free";
        isRegistrationCompleted: boolean;
    };
    summary: {
        bmi: { value: number | null; category: string | null };
        currentWeight: { value: number | null; unit: string | null };
        targetWeight: { value: number | null; unit: string | null; timeframeWeeks: number | null };
        exerciseCommitment: { daysPerWeek: number | null; minutesPerDay: number | null };
        planPeriod: { startDate: Date | null; endDate: Date | null };
    };
    account: {
        userId: string;
        mobile: string | null;
        email: string | null;
        fcmToken: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    };
    biometrics: {
        age: number | null;
        gender: string | null;
        height: { value: number | null; unit: string | null };
        weight: { value: number | null; unit: string | null };
        bmi: number | null;
        menstrualProfileExists: boolean;
        physicalIssues: iNamedRef[];
    };
    goalAndProfession: {
        goal: iNamedRef | null;
        profession: iNamedRef | null;
        aiGeneratedWorkoutPlan: boolean;
        isRegistrationCompleted: boolean;
    };
    activityPreferences: {
        activityLevel: string | null;
        preferredExerciseTime: string | null;
        exerciseDays: string[];
        stepsGoal: number | null;
        waterGoalGlasses: number | null;
        targetTimeframeWeeks: number | null;
    };
    nutritionProfile: {
        foodPreference: iNamedRef | null;
        foodAllergies: iNamedRef[];
        foodIntolerances: iNamedRef[];
        dietaryRestrictions: iNamedRef[];
    };
    vitals: iUserVitals;
}
