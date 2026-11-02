import mongoose, { Model, Schema } from "mongoose";
import { iUsers } from "../../interfaces/user.interface";
import { cDbNames } from "../../consts/db.const";

type UserModel = Model<iUsers>;

// Read-only mirror of the user app's "users" collection (only the fields the admin dashboard reads).
const UserSchema = new Schema<iUsers>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        fullName: { type: String },
        mobile: { type: String },
        email: { type: String },
        age: { type: Number },
        gender: { type: String },
        height: { type: Number },
        heightUnit: { type: String },
        weight: { type: Number },
        weightUnit: { type: String },
        bmi: { type: Number },
        isPremium: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        isRegistrationCompleted: { type: Boolean, default: false },
        goal: { type: Schema.Types.ObjectId },
        profession: { type: Schema.Types.ObjectId },
        physicalIssues: { type: [Schema.Types.ObjectId] },
        fcmToken: { type: String },
        profilePic: { type: String },
        targetWeight: { type: Number },
        targetTimeframe: { type: Number },
        stepsGoal: { type: Number },
        goalWaterIntake: { type: Number },
        doesMenstrualProfileExist: { type: Boolean },
        exerciseDaysPerWeek: { type: Number },
        exerciseTimePerDay: { type: Number },
        regularPhysicalActivity: { type: String },
        preferredTimeForExercise: { type: String },
        exerciseDays: { type: [String] },
        startWorkoutPlanDate: { type: Date },
        endWorkoutPlanDate: { type: Date },
        hasCustomizedWorkoutPlan: { type: Boolean },
        foodPreferenceId: { type: Schema.Types.ObjectId },
        foodAllergyIds: { type: [Schema.Types.ObjectId] },
        foodIntoleranceIds: { type: [Schema.Types.ObjectId] },
        dietaryRestrictionIds: { type: [Schema.Types.ObjectId] },
        platform: { type: String },
        appVersion: { type: String },
    },
    {
        timestamps: true,
        collection: cDbNames.users,
    }
);

const UserDb: UserModel = mongoose.model<iUsers>(cDbNames.users, UserSchema, cDbNames.users);
export default UserDb;
