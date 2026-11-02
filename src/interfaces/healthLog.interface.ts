import { Types } from "mongoose";

export interface iHealthLog {
    userId: Types.ObjectId;
    date?: Date;
    createdAt?: Date;
}
