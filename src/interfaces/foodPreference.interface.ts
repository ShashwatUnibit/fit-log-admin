import { Schema } from "mongoose";

export interface iFoodPreference {
    _id?: Schema.Types.ObjectId | string;
    title: string;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateFoodPreferencePayload {
    title: string;
    subtitle: string;
    imageUrl: string;
}

export interface iUpdateFoodPreferencePayload {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
}
