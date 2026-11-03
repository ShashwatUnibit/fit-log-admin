import mongoose, { Model, Schema } from "mongoose";
import { iFaq } from "../../interfaces/faq.interface";
import { cDbNames } from "../../consts/db.const";

type FaqModel = Model<iFaq>;

// Shared with the user app's "faqs" collection.
const FaqSchema = new Schema<iFaq>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.faqs,
    }
);

const FaqDb: FaqModel = mongoose.model<iFaq>(cDbNames.faqs, FaqSchema, cDbNames.faqs);
export default FaqDb;
