import mongoose, { Model, Schema } from "mongoose";
import { iFoodPreference } from "../../interfaces/foodPreference.interface";
import { cDbNames } from "../../consts/db.const";
import { eFoodPreferences } from "../../enums/foodItems.enum";
import UUIDModule from "../../modules/uuid.module";

type FoodPreferenceModel = Model<iFoodPreference>;

const FoodPreferenceSchema = new Schema<iFoodPreference>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        title: { type: String, required: true, enum: Object.values(eFoodPreferences) },
        subtitle: { type: String, required: true, trim: true },
        imageUrl: { type: String, required: true, trim: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.foodPreference,
    }
);

const FoodPreferenceDb: FoodPreferenceModel = mongoose.model<iFoodPreference>(cDbNames.foodPreference, FoodPreferenceSchema, cDbNames.foodPreference);

export default FoodPreferenceDb;

