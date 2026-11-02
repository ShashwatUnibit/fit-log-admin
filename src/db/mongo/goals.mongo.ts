import mongoose, { Model, Schema } from "mongoose";
import { iGoal } from "../../interfaces/goal.interface";
import { cDbNames } from "../../consts/db.const";

type GoalModel = Model<iGoal>;

// Read-only mirror of the user app's "goals" collection.
const GoalSchema = new Schema<iGoal>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        goalName: { type: String },
        goalIcon: { type: String },
        goalDescription: { type: String },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.goals,
    }
);

const GoalDb: GoalModel = mongoose.model<iGoal>(cDbNames.goals, GoalSchema, cDbNames.goals);
export default GoalDb;
