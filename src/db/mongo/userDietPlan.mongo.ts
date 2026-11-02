import mongoose, { Model, Schema } from "mongoose";
import { iUserDietPlan } from "../../interfaces/userDietPlan.interface";

type UserDietPlanModel = Model<iUserDietPlan>;

// Read-only mirror of the user app's diet plans. The user app registers the model as "dietPlans" without an
// explicit collection, so Mongoose stores it in "dietplans".
const UserDietPlanSchema = new Schema<iUserDietPlan>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        userId: { type: Schema.Types.ObjectId, required: true },
        foodPreferences: { type: String },
        foodAllergies: { type: [String] },
        foodIntolerances: { type: [String] },
        dietaryRestrictions: { type: [String] },
        avgCalories: { type: Number },
        protein: { type: String },
        daysCount: { type: Number },
        weeklyPlan: { type: [Schema.Types.Mixed] },
        nutritionTips: { type: [String] },
        startDate: { type: Date },
        endDate: { type: Date },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: "dietplans",
    }
);

const UserDietPlanDb: UserDietPlanModel = mongoose.model<iUserDietPlan>("UserDietPlanMirror", UserDietPlanSchema, "dietplans");
export default UserDietPlanDb;
