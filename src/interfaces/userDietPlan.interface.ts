import { Types } from "mongoose";

export interface iDietMealItem {
    name?: string;
    portionSize?: string;
}

export interface iDietMeal {
    name?: string;
    calories?: number;
    items?: iDietMealItem[];
}

export interface iDietDay {
    dayNumber?: number;
    dayName?: string;
    totalCalories?: number;
    meals?: iDietMeal[];
}

export interface iUserDietPlan {
    _id?: Types.ObjectId;
    userId: Types.ObjectId;
    foodPreferences?: string;
    foodAllergies?: string[];
    foodIntolerances?: string[];
    dietaryRestrictions?: string[];
    avgCalories?: number;
    protein?: string;
    daysCount?: number;
    weeklyPlan?: iDietDay[];
    nutritionTips?: string[];
    startDate?: Date;
    endDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
