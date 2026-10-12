import mongoose, { Model, Schema } from "mongoose";
import { iYoga, iYogaInstruction } from "../../interfaces/yoga.interface";
import { cDbNames } from "../../consts/db.const";

type YogaModel = Model<iYoga>;

const YogaInstructionSchema = new Schema<iYogaInstruction>(
    {
        stepNumber: { type: Number, required: true },
        instruction: { type: String, required: true, trim: true },
        breathCue: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const YogaSchema = new Schema<iYoga>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        englishName: { type: String, trim: true, default: "" },
        sanskritName: { type: String, trim: true, default: "" },
        sanskritNamePhonetic: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        benefits: { type: [String], default: [] },
        instructions: { type: [YogaInstructionSchema], default: [] },
        defaultHoldDurationSeconds: { type: Number, default: 30 },
        recommendedRepitition: { type: Number, default: 1 },
        timeTakenPerRepetition: { type: Number, default: 60 },
        totalTimeTaken: { type: Number, default: 60 },
        propsRequired: { type: [String], default: [] },
        breathingGuidance: { type: String, trim: true, default: "" },
        imageUrl: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.yoga,
    }
);

YogaSchema.index({ englishName: 1 });
YogaSchema.index({ sanskritName: 1 });

const YogaDb: YogaModel = mongoose.model<iYoga>(cDbNames.yoga, YogaSchema, cDbNames.yoga);

export default YogaDb;
