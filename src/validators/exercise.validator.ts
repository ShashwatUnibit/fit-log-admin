import Joi from "joi";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";
import { iCreateExercisePayload, iGetExercisesQuery } from "../interfaces/exercise.interface";

export default class ExerciseValidator {
    public static instance: ExerciseValidator = new ExerciseValidator();
    private constructor() {}

    public createSchema = Joi.object<iCreateExercisePayload>({
        name: Joi.string().trim().required().messages({
            "string.base": `"name" should be a type of 'text'`,
            "string.empty": `"name" cannot be empty`,
            "any.required": `"name" is a required field`,
        }),
        description: Joi.string().trim().optional().allow(""),
        focusPart: Joi.string()
            .valid(...Object.values(eFocusPart))
            .required()
            .messages({
                "string.base": `"focusPart" should be a type of 'text'`,
                "any.only": `"focusPart" must be one of the allowed eFocusPart values`,
                "any.required": `"focusPart" is a required field`,
            }),
        imageUrl: Joi.string().trim().optional().allow(""),
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

