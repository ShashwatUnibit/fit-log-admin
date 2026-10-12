import mongoose, { Model, Schema } from "mongoose";
import { iFoodIntolerance } from "../../interfaces/foodIntolerance.interface";
import { cDbNames } from "../../consts/db.const";
import { eFoodIntolerances } from "../../enums/foodItems.enum";

type FoodIntoleranceModel = Model<iFoodIntolerance>;

const FoodIntoleranceSchema = new Schema<iFoodIntolerance>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        title: { type: String, required: true, enum: Object.values(eFoodIntolerances) },
        subtitle: { type: String, required: true, trim: true },
        imageUrl: { type: String, required: true, trim: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.foodIntolerance,
    }
);

const FoodIntoleranceDb: FoodIntoleranceModel = mongoose.model<iFoodIntolerance>(cDbNames.foodIntolerance, FoodIntoleranceSchema, cDbNames.foodIntolerance);

export default FoodIntoleranceDb;
