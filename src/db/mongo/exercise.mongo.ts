import mongoose, { Model, Schema } from "mongoose";
import {
    iCommonMistakeCorrection,
    iExercise,
    iExerciseLevelDetails,
    iHealthProfilePrecaution,
    iPrimaryFocusMuscle,
    iStepByStepInstruction,
    iTargetMuscles,
} from "../../interfaces/exercise.interface";
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

const HealthProfilePrecautionSchema = new Schema<iHealthProfilePrecaution>(
    {
        title: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        conditions: { type: [String], default: [] },
    },
    { _id: false }
);

const PrimaryFocusMuscleSchema = new Schema<iPrimaryFocusMuscle>(
    {
        name: { type: String, trim: true, default: "" },
        anatomicalName: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const TargetMusclesSchema = new Schema<iTargetMuscles>(
    {
        primaryFocus: { type: PrimaryFocusMuscleSchema, default: () => ({ name: "", anatomicalName: "" }) },
        secondaryFocus: { type: [String], default: [] },
    },
    { _id: false }
);

const StepByStepInstructionSchema = new Schema<iStepByStepInstruction>(
    {
        stepNumber: { type: Number, required: true },
        title: { type: String, trim: true, required: true },
        description: { type: String, trim: true, required: true },
        tip: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const CommonMistakeCorrectionSchema = new Schema<iCommonMistakeCorrection>(
    {
        avoid: { type: String, trim: true, required: true },
        fix: { type: String, trim: true, required: true },
        why: { type: String, trim: true, required: true },
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
        image: { type: String, trim: true, default: "" },
        video: { type: String, trim: true, default: "" },
        healthProfilePrecaution: { type: HealthProfilePrecautionSchema, default: () => ({}) },
        targetMuscles: { type: TargetMusclesSchema, default: () => ({}) },
        stepByStepInstructions: { type: [StepByStepInstructionSchema], default: [] },
        commonMistakesAndCorrections: { type: [CommonMistakeCorrectionSchema], default: [] },
        breathingPattern: { type: String, trim: true, default: "" },
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
