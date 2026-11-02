import mongoose, { Model, Schema } from "mongoose";
import { iHealthLog } from "../../interfaces/healthLog.interface";

type HealthLogModel = Model<iHealthLog>;

// Read-only mirrors of the user app's tracking collections (only the fields the dashboard reads).
// Collection names are the ones Mongoose derives in the user app (lower-cased + pluralised).
function buildModel(params: { name: string; collection: string; hasDate: boolean }): HealthLogModel {
    const { name, collection, hasDate } = params;
    const schema = new Schema<iHealthLog>(
        {
            userId: { type: Schema.Types.ObjectId, required: true },
            ...(hasDate ? { date: { type: Date } } : {}),
        },
        { timestamps: true, collection }
    );
    return mongoose.model<iHealthLog>(name, schema, collection);
}

export const StepsLogDb = buildModel({ name: "StepsLog", collection: "steps", hasDate: false });
export const WaterLogDb = buildModel({ name: "WaterLog", collection: "waterintakes", hasDate: true });
export const HeartRateLogDb = buildModel({ name: "HeartRateLog", collection: "heartrates", hasDate: false });
export const BloodPressureLogDb = buildModel({ name: "BloodPressureLog", collection: "bloodpressures", hasDate: true });
export const BloodSugarLogDb = buildModel({ name: "BloodSugarLog", collection: "bloodsugars", hasDate: true });
export const MoodLogDb = buildModel({ name: "MoodLog", collection: "moods", hasDate: true });
