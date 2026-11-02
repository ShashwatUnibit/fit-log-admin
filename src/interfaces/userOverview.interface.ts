export interface iNamedRef {
    id: string;
    name: string | null;
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
}
