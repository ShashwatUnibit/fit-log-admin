import { Schema } from "mongoose";

export interface iFoodIntolerance {
    _id?: Schema.Types.ObjectId | string;
    title: string;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateFoodIntolerancePayload {
    title: string;
    subtitle: string;
    imageUrl: string;
}

export interface iUpdateFoodIntolerancePayload {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
}
