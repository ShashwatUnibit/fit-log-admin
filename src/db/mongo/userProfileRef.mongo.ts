import mongoose, { Model, Schema } from "mongoose";
import { iPhysicalIssue, iProfession } from "../../interfaces/userProfileRef.interface";

// Read-only mirrors of user-app collections used on the admin user overview.
// Collection names are the ones Mongoose derives in the user app (lower-cased + pluralised).
const ProfessionDb: Model<iProfession> = mongoose.model<iProfession>(
    "ProfessionRef",
    new Schema<iProfession>({ professionName: { type: String } }, { collection: "professions" }),
    "professions"
);

const PhysicalIssueDb: Model<iPhysicalIssue> = mongoose.model<iPhysicalIssue>(
    "PhysicalIssueRef",
    new Schema<iPhysicalIssue>({ physicalIssueName: { type: String } }, { collection: "physicalissues" }),
    "physicalissues"
);

export { PhysicalIssueDb, ProfessionDb };
