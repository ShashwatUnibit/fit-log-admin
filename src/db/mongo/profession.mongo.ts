import mongoose, { Model, Schema } from "mongoose";
import { iProfession } from "../../interfaces/profession.interface";
import { cDbNames } from "../../consts/db.const";

type ProfessionModel = Model<iProfession>;

// Shared with the user app, which reads this collection (name derived by Mongoose there).
const ProfessionSchema = new Schema<iProfession>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        professionIcon: { type: String, required: true },
        professionName: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.professions,
    }
);

const ProfessionDb: ProfessionModel = mongoose.model<iProfession>(cDbNames.professions, ProfessionSchema, cDbNames.professions);
export default ProfessionDb;
