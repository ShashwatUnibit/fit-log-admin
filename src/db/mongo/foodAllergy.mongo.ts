import mongoose, { Model, Schema } from "mongoose";
import { iFoodAllergy } from "../../interfaces/foodAllergy.interface";
import { cDbNames } from "../../consts/db.const";
import { eFoodAllergies } from "../../enums/foodItems.enum";

type FoodAllergyModel = Model<iFoodAllergy>;

const FoodAllergySchema = new Schema<iFoodAllergy>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        title: { type: String, required: true, enum: Object.values(eFoodAllergies) },
        subtitle: { type: String, required: true, trim: true },
        imageUrl: { type: String, required: true, trim: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.foodAllergy,
    }
);

const FoodAllergyDb: FoodAllergyModel = mongoose.model<iFoodAllergy>(cDbNames.foodAllergy, FoodAllergySchema, cDbNames.foodAllergy);

export default FoodAllergyDb;
