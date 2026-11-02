import { Schema } from "mongoose";

export interface iFoodAllergy {
    _id?: Schema.Types.ObjectId | string;
    title: string;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateFoodAllergyPayload {
    title: string;
    subtitle: string;
    imageUrl: string;
}

export interface iUpdateFoodAllergyPayload {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
}
