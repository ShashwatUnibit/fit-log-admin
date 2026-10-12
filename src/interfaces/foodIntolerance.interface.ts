import { Schema } from "mongoose";
import { eFoodIntolerances } from "../enums/foodItems.enum";

export interface iFoodIntolerance {
    _id?: Schema.Types.ObjectId | string;
    title: eFoodIntolerances;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateFoodIntolerancePayload {
    title: eFoodIntolerances;
    subtitle: string;
    imageUrl: string;
}
