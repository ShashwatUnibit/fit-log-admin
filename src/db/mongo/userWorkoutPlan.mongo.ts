import mongoose, { Model, Schema } from "mongoose";
import { iUserWorkoutPlan } from "../../interfaces/userWorkoutPlan.interface";
import { cDbNames } from "../../consts/db.const";

type UserWorkoutPlanModel = Model<iUserWorkoutPlan>;

// Read-only mirror of the user app's "userWorkoutPlans" collection (the user app sets this collection name explicitly).
const UserWorkoutPlanSchema = new Schema<iUserWorkoutPlan>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        userId: { type: Schema.Types.ObjectId, required: true },
        name: { type: String },
        dailyPlan: { type: [Schema.Types.Mixed] },
        totalExercises: { type: Number },
        totalDuration: { type: Number },
        totalCaloriesBurn: { type: Number },
        startDate: { type: Date },
        endDate: { type: Date },
        daysCount: { type: Number },
        blockNumber: { type: Number },
        daysPassedInProgram: { type: Number },
        daysRemainingInProgram: { type: Number },
        totalProgramDays: { type: Number },
        isActive: { type: Boolean },
        isDeleted: { type: Boolean },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.userWorkoutPlan,
    }
);

const UserWorkoutPlanDb: UserWorkoutPlanModel = mongoose.model<iUserWorkoutPlan>(
    "UserWorkoutPlanMirror",
    UserWorkoutPlanSchema,
    cDbNames.userWorkoutPlan
);
export default UserWorkoutPlanDb;
