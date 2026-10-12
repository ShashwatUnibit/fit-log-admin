import Joi from "joi";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";
import { iCreateExercisePayload, iGetExercisesQuery } from "../interfaces/exercise.interface";

export default class ExerciseValidator {
    public static instance: ExerciseValidator = new ExerciseValidator();
    private constructor() { }

    public createSchema = Joi.object<iCreateExercisePayload>({
        name: Joi.string().trim().required().messages({
            "string.base": `"name" should be a type of 'text'`,
            "string.empty": `"name" cannot be empty`,
            "any.required": `"name" is a required field`,
        }),
        focusPart: Joi.string()
            .valid(...Object.values(eFocusPart))
            .required()
            .messages({
                "string.base": `"focusPart" should be a type of 'text'`,
                "any.only": `"focusPart" must be one of the allowed eFocusPart values`,
                "any.required": `"focusPart" is a required field`,
            }),
        description: Joi.string().trim().optional().allow(""),
        imageUrl: Joi.string().trim().optional().allow(""),
        image: Joi.string().trim().optional().allow(""),
        videoUrl: Joi.string().trim().optional().allow(""),
        video: Joi.string().trim().optional().allow(""),
        equipmentRequired: Joi.string().trim().optional().allow(""),
        exerciseType: Joi.string().valid(...Object.values(eExerciseType)).optional(),
        healthProfilePrecaution: Joi.object({
            title: Joi.string().trim().optional().allow(""),
            description: Joi.string().trim().optional().allow(""),
            conditions: Joi.array().items(Joi.string().trim()).optional(),
        }).optional(),
        targetMuscles: Joi.object({
            primaryFocus: Joi.object({
                name: Joi.string().trim().optional().allow(""),
                anatomicalName: Joi.string().trim().optional().allow(""),
            }).optional(),
            secondaryFocus: Joi.array().items(Joi.string().trim()).optional(),
        }).optional(),
        stepByStepInstructions: Joi.array()
            .items(
                Joi.object({
                    stepNumber: Joi.number().integer().min(1).optional(),
                    title: Joi.string().trim().required(),
                    description: Joi.string().trim().required(),
                    tip: Joi.string().trim().optional().allow(""),
                })
            )
            .optional(),
        commonMistakesAndCorrections: Joi.array()
            .items(
                Joi.object({
                    avoid: Joi.string().trim().required(),
                    fix: Joi.string().trim().required(),
                    why: Joi.string().trim().required(),
                })
            )
            .optional(),
        breathingPattern: Joi.string().trim().optional().allow(""),
        levels: Joi.array()
            .items(
                Joi.object({
                    level: Joi.string().valid(...Object.values(eExerciseLevel)).required(),
                    repetition: Joi.number().integer().min(1).required(),
                    sets: Joi.number().integer().min(1).required(),
                    restTime: Joi.number().min(0).required(),
                    caloriesBurn: Joi.number().min(0).required(),
                    durationPerSet: Joi.number().min(1).required(),
                    totalTimeToComplete: Joi.number().min(1).required(),
                })
            )
            .optional(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public getExercisesQuerySchema = Joi.object<iGetExercisesQuery>({
        focusPart: Joi.string()
            .valid(...Object.values(eFocusPart))
            .optional()
            .messages({
                "string.base": `"focusPart" should be a type of 'text'`,
                "any.only": `"focusPart" must be one of the allowed eFocusPart values`,
            }),
        exerciseType: Joi.string()
            .valid(...Object.values(eExerciseType))
            .optional()
            .messages({
                "string.base": `"exerciseType" should be a type of 'text'`,
                "any.only": `"exerciseType" must be one of the allowed eExerciseType values`,
            }),
        exerciseLevel: Joi.string()
            .valid(...Object.values(eExerciseLevel))
            .optional()
            .messages({
                "string.base": `"exerciseLevel" should be a type of 'text'`,
                "any.only": `"exerciseLevel" must be one of the allowed eExerciseLevel values`,
            }),
        level: Joi.string()
            .valid(...Object.values(eExerciseLevel))
            .optional()
            .messages({
                "string.base": `"level" should be a type of 'text'`,
                "any.only": `"level" must be one of the allowed eExerciseLevel values`,
            }),
        equipmentRequired: Joi.string().trim().optional().allow("").messages({
            "string.base": `"equipmentRequired" should be a type of 'text'`,
        }),
        totalTimeToComplete: Joi.number().min(1).optional().messages({
            "number.base": `"totalTimeToComplete" should be a type of 'number'`,
            "number.min": `"totalTimeToComplete" must be at least 1`,
        }),
        page: Joi.number().integer().min(1).optional().messages({
            "number.base": `"page" should be a type of 'number'`,
            "number.min": `"page" must be at least 1`,
        }),
        limit: Joi.number().integer().min(1).max(100).optional().messages({
            "number.base": `"limit" should be a type of 'number'`,
            "number.min": `"limit" must be at least 1`,
            "number.max": `"limit" cannot exceed 100`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: true, stripUnknown: true });
}
