import { Schema } from "mongoose";
import { eFoodAllergies } from "../enums/foodItems.enum";

export interface iFoodAllergy {
    _id?: Schema.Types.ObjectId | string;
    title: eFoodAllergies;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateFoodAllergyPayload {
    title: eFoodAllergies;
    subtitle: string;
    imageUrl: string;
}
