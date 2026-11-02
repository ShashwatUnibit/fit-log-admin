import { Schema } from "mongoose";

export interface iDietaryRestriction {
    _id?: Schema.Types.ObjectId | string;
    title: string;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateDietaryRestrictionPayload {
    title: string;
    subtitle: string;
    imageUrl: string;
}

export interface iUpdateDietaryRestrictionPayload {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
}
