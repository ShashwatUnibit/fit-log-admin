import mongoose, { Model, Schema } from "mongoose";
import { iExercise, iExerciseLevelDetails } from "../../interfaces/exercise.interface";
import { cDbNames } from "../../consts/db.const";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../../enums/exercise.enum";

type ExerciseModel = Model<iExercise>;

const ExerciseLevelDetailsSchema = new Schema<iExerciseLevelDetails>(
    {
        level: { type: String, required: true, enum: Object.values(eExerciseLevel) },
        repetition: { type: Number, required: true },
        sets: { type: Number, required: true },
        restTime: { type: Number, required: true },
        caloriesBurn: { type: Number, required: true },
        durationPerSet: { type: Number, required: true },
        totalTimeToComplete: { type: Number, required: true },
    },
    { _id: false }
);

const ExerciseSchema = new Schema<iExercise>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        focusPart: { type: String, required: true, enum: Object.values(eFocusPart) },
        exerciseType: { type: String, required: true, enum: Object.values(eExerciseType) },
        equipmentRequired: { type: String, trim: true, default: "None" },
        imageUrl: { type: String, trim: true, default: "" },
        levels: { type: [ExerciseLevelDetailsSchema], required: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.exercise,
    }
);

const ExerciseDb: ExerciseModel = mongoose.model<iExercise>(cDbNames.exercise, ExerciseSchema, cDbNames.exercise);

export default ExerciseDb;
