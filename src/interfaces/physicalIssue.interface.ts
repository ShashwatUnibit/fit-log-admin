import { Types } from "mongoose";

export interface iPhysicalIssue {
    _id?: Types.ObjectId;
    physicalIssueIcon: string;
    physicalIssueName: string;
    isActive: boolean;
}
