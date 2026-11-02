export interface iDietPlanHistoryQuery {
    page: number;
    limit: number;
}

export interface iDietMealItemView {
    name: string | null;
    portionSize: string | null;
}

export interface iDietMealView {
    name: string | null;
    calories: number;
    items: iDietMealItemView[];
}

export interface iDietDayView {
    dayNumber: number;
    dayName: string | null;
    totalCalories: number;
    meals: iDietMealView[];
}

export interface iDietPlanView {
    dietPlanId: string;
    userId: string;
    name: string;
    foodPreference: string | null;
    isActive: boolean;
    status: "Active" | "Inactive";
    avgCalories: number | null;
    protein: string | null;
    daysCount: number | null;
    startDate: Date | null;
    endDate: Date | null;
    allergies: string[];
    intolerances: string[];
    restrictions: string[];
    nutritionTips: string[];
    createdAt: Date | null;
    weeklyPlan: iDietDayView[];
}

export interface iDietPlanHistory {
    summary: { totalPlans: number; activePlans: number };
    plans: iDietPlanView[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}
