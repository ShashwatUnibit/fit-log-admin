import mongoose, { Model, Schema } from "mongoose";
import { iWorkoutPlan, iWorkoutPlanExercise } from "../../interfaces/workoutPlan.interface";
import { cDbNames } from "../../consts/db.const";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../../enums/exercise.enum";
import { iExerciseLevelDetails } from "../../interfaces/exercise.interface";

type WorkoutPlanModel = Model<iWorkoutPlan>;

const SelectedLevelSchema = new Schema<iExerciseLevelDetails>(
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

const WorkoutPlanExerciseSchema = new Schema<iWorkoutPlanExercise>(
    {
        exerciseId: { type: Schema.Types.ObjectId, ref: cDbNames.exercise },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        focusPart: { type: String, required: true, enum: Object.values(eFocusPart) },
        exerciseType: { type: String, required: true, enum: Object.values(eExerciseType) },
        equipmentRequired: { type: String, trim: true, default: "None" },
        imageUrl: { type: String, trim: true, default: "" },
        selectedLevel: { type: SelectedLevelSchema, required: true },
        workTime: { type: Number, required: true },
        note: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const WorkoutPlanSchema = new Schema<iWorkoutPlan>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        name: { type: String, required: true, trim: true },
        subtitle: { type: String, trim: true, default: "" },
        description: { type: String, required: true, trim: true },
        exerciseFor: { type: String, required: true, enum: Object.values(eFocusPart) },
        level: { type: String, required: true, enum: Object.values(eExerciseLevel) },
        focusParts: { type: [String], required: true },
        totalExercises: { type: Number, required: true, default: 0 },
        totalDuration: { type: Number, required: true, default: 0 },
        totalCaloriesBurn: { type: Number, required: true, default: 0 },
        exercises: { type: [WorkoutPlanExerciseSchema], required: true },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.workoutPlan,
    }
);

WorkoutPlanSchema.index(
    { exerciseFor: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
);

const WorkoutPlanDb: WorkoutPlanModel = mongoose.model<iWorkoutPlan>(
    cDbNames.workoutPlan,
    WorkoutPlanSchema,
    cDbNames.workoutPlan
);

export default WorkoutPlanDb;
