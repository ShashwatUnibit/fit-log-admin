import mongoose, { Model, Schema } from "mongoose";
import { iPhysicalIssue } from "../../interfaces/physicalIssue.interface";
import { cDbNames } from "../../consts/db.const";

type PhysicalIssueModel = Model<iPhysicalIssue>;

// Shared with the user app, which reads this collection (name derived by Mongoose there).
const PhysicalIssueSchema = new Schema<iPhysicalIssue>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        physicalIssueIcon: { type: String, required: true },
        physicalIssueName: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.physicalIssues,
    }
);

const PhysicalIssueDb: PhysicalIssueModel = mongoose.model<iPhysicalIssue>(cDbNames.physicalIssues, PhysicalIssueSchema, cDbNames.physicalIssues);
export default PhysicalIssueDb;
