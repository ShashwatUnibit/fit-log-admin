import mongoose, { Model, Schema } from "mongoose";
import { iDietaryRestriction } from "../../interfaces/dietaryRestriction.interface";
import { cDbNames } from "../../consts/db.const";
import { eDietaryRestrictions } from "../../enums/foodItems.enum";

type DietaryRestrictionModel = Model<iDietaryRestriction>;

const DietaryRestrictionSchema = new Schema<iDietaryRestriction>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        title: { type: String, required: true, enum: Object.values(eDietaryRestrictions) },
        subtitle: { type: String, required: true, trim: true },
        imageUrl: { type: String, required: true, trim: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.dietaryRestriction,
    }
);

const DietaryRestrictionDb: DietaryRestrictionModel = mongoose.model<iDietaryRestriction>(cDbNames.dietaryRestriction, DietaryRestrictionSchema, cDbNames.dietaryRestriction);

export default DietaryRestrictionDb;
