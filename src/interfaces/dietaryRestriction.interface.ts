import { Schema } from "mongoose";
import { eDietaryRestrictions } from "../enums/foodItems.enum";

export interface iDietaryRestriction {
    _id?: Schema.Types.ObjectId | string;
    title: eDietaryRestrictions;
    subtitle: string;
    imageUrl: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iCreateDietaryRestrictionPayload {
    title: eDietaryRestrictions;
    subtitle: string;
    imageUrl: string;
}
