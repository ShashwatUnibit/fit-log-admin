import mongoose, { Schema } from "mongoose";
import { iMenstrualInsight, iMenstrualProfile, iPeriodLog } from "../../interfaces/menstrual.interface";

// Read-only mirrors of the user app's collections. Names are the ones Mongoose derives in the user app
// (lower-cased + pluralised).
export const MenstrualProfileDb = mongoose.model<iMenstrualProfile>(
    "MenstrualProfileMirror",
    new Schema<iMenstrualProfile>(
        {
            userId: { type: Schema.Types.ObjectId, required: true },
            lastPeriodStartDate: { type: Date },
            typicalCycleLength: { type: Number },
            typicalPeriodLength: { type: Number },
            cycleRegularity: { type: String },
            trackingStartedAt: { type: Date },
        },
        { timestamps: true, collection: "menstrualprofiles" }
    ),
    "menstrualprofiles"
);

export const PeriodLogDb = mongoose.model<iPeriodLog>(
    "PeriodLogMirror",
    new Schema<iPeriodLog>(
        {
            userId: { type: Schema.Types.ObjectId, required: true },
            periodStartDate: { type: Date },
            periodEndDate: { type: Date },
            durationDays: { type: Number },
            flowIntensity: { type: String },
            symptoms: { type: [String] },
            notes: { type: String },
        },
        { timestamps: true, collection: "periodlogs" }
    ),
    "periodlogs"
);

export const MenstrualInsightDb = mongoose.model<iMenstrualInsight>(
    "MenstrualInsightMirror",
    new Schema<iMenstrualInsight>(
        {
            userId: { type: Schema.Types.ObjectId, required: true },
            dateKey: { type: String },
            phase: { type: String },
            status: { type: String },
            tips: { type: [String] },
            remedies: { type: [String] },
        },
        { timestamps: true, collection: "menstrualinsights" }
    ),
    "menstrualinsights"
);
