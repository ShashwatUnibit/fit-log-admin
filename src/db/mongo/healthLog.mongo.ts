import mongoose, { Model, Schema, SchemaDefinition } from "mongoose";
import { iHealthLog } from "../../interfaces/healthLog.interface";

type HealthLogModel = Model<iHealthLog>;

// Read-only mirrors of the user app's tracking collections (only the fields the dashboard reads).
// Collection names are the ones Mongoose derives in the user app (lower-cased + pluralised).
function buildModel(params: { name: string; collection: string; hasDate: boolean; fields?: SchemaDefinition }): HealthLogModel {
    const { name, collection, hasDate, fields } = params;
    const schema = new Schema<iHealthLog>(
        {
            userId: { type: Schema.Types.ObjectId, required: true },
            ...(hasDate ? { date: { type: Date } } : {}),
            ...fields,
        },
        { timestamps: true, collection }
    );
    return mongoose.model<iHealthLog>(name, schema, collection);
}

export const StepsLogDb = buildModel({ name: "StepsLog", collection: "steps", hasDate: false, fields: { coveredSteps: { type: Number } } });
export const WaterLogDb = buildModel({ name: "WaterLog", collection: "waterintakes", hasDate: true, fields: { consumedWaterIntake: { type: Number } } });
export const HeartRateLogDb = buildModel({ name: "HeartRateLog", collection: "heartrates", hasDate: false, fields: { beatsPerMinute: { type: Number } } });
export const BloodPressureLogDb = buildModel({ name: "BloodPressureLog", collection: "bloodpressures", hasDate: true, fields: { systolic: { type: Number }, diastolic: { type: Number } } });
export const BloodSugarLogDb = buildModel({ name: "BloodSugarLog", collection: "bloodsugars", hasDate: true, fields: { bloodSugar: { type: Number }, mealContext: { type: String } } });
export const MoodLogDb = buildModel({ name: "MoodLog", collection: "moods", hasDate: true, fields: { mood: { type: String }, description: { type: String } } });
