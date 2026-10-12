import Joi from "joi";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";
import { iCreateWorkoutPlanPayload } from "../interfaces/workoutPlan.interface";

export default class WorkoutPlanValidator {
    public static instance: WorkoutPlanValidator = new WorkoutPlanValidator();
    private constructor() { }

    private selectedLevelSchema = Joi.object({
        level: Joi.string()
            .valid(...Object.values(eExerciseLevel))
            .required()
            .messages({
                "any.only": `"selectedLevel.level" must be one of the allowed eExerciseLevel values`,
                "any.required": `"selectedLevel.level" is a required field`,
            }),
        repetition: Joi.number().positive().required(),
        sets: Joi.number().positive().required(),
        restTime: Joi.number().min(0).required(),
        caloriesBurn: Joi.number().min(0).required(),
        durationPerSet: Joi.number().positive().required(),
        totalTimeToComplete: Joi.number().positive().required(),
    }).options({ convert: true, abortEarly: true, allowUnknown: true });

    private exerciseItemSchema = Joi.object({
        _id: Joi.string().optional(),
        exerciseId: Joi.string().optional(),
        name: Joi.string().trim().required().messages({
            "string.empty": `"exercises[].name" cannot be empty`,
            "any.required": `"exercises[].name" is a required field`,
        }),
        description: Joi.string().trim().optional().allow(""),
        focusPart: Joi.string()
            .valid(...Object.values(eFocusPart))
            .required()
            .messages({
                "any.only": `"exercises[].focusPart" must be one of the allowed eFocusPart values`,
                "any.required": `"exercises[].focusPart" is a required field`,
            }),
        exerciseType: Joi.string()
            .valid(...Object.values(eExerciseType))
            .required()
            .messages({
                "any.only": `"exercises[].exerciseType" must be one of the allowed eExerciseType values`,
                "any.required": `"exercises[].exerciseType" is a required field`,
            }),
        equipmentRequired: Joi.string().trim().optional().allow(""),
        imageUrl: Joi.string().trim().optional().allow(""),
        selectedLevel: this.selectedLevelSchema.required().messages({
            "any.required": `"exercises[].selectedLevel" is a required field`,
        }),
        note: Joi.string().trim().optional().allow(""),
    }).options({ convert: true, abortEarly: true, allowUnknown: true });

    public createSchema = Joi.object<iCreateWorkoutPlanPayload>({
        name: Joi.string().trim().required().messages({
            "string.base": `"name" should be a type of 'text'`,
            "string.empty": `"name" cannot be empty`,
            "any.required": `"name" is a required field`,
        }),
        description: Joi.string().trim().required().messages({
            "string.base": `"description" should be a type of 'text'`,
            "string.empty": `"description" cannot be empty`,
            "any.required": `"description" is a required field`,
        }),
        exerciseFor: Joi.string()
            .valid(...Object.values(eFocusPart))
            .required()
            .messages({
                "string.base": `"exerciseFor" should be a type of 'text'`,
                "any.only": `"exerciseFor" must be one of the allowed eFocusPart values`,
                "any.required": `"exerciseFor" is a required field`,
            }),
        exercises: Joi.array()
            .items(this.exerciseItemSchema)
            .min(1)
            .required()
            .messages({
                "array.min": `"exercises" must contain at least 1 exercise`,
                "any.required": `"exercises" is a required field`,
            }),
        isActive: Joi.boolean().optional(),
        level: Joi.string().valid(...Object.values(eExerciseLevel)).optional(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
