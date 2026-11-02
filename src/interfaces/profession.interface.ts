import { Types } from "mongoose";

export interface iProfession {
    _id?: Types.ObjectId;
    professionIcon: string;
    professionName: string;
    isActive: boolean;
}
