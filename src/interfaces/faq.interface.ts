import { Types } from "mongoose";

export interface iFaq {
    _id?: Types.ObjectId;
    question: string;
    answer: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
