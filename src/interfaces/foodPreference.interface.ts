import { Schema } from "mongoose";
import { eFoodPreferences } from "../enums/foodItems.enum";

export interface iFoodPreference {
    _id?: Schema.Types.ObjectId | string;
    title: eFoodPreferences;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateFoodPreferencePayload {
    title: eFoodPreferences;
    subtitle: string;
    imageUrl: string;
}
