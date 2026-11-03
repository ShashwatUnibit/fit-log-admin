import Joi from "joi";

const idSchema = (field: string): Joi.StringSchema =>
    Joi.string().trim().length(24).hex().required().messages({
        "string.base": `"${field}" should be a type of 'text'`,
        "string.empty": `"${field}" cannot be empty`,
        "string.length": `"${field}" should have a length of {#limit}`,
        "string.hex": `"${field}" must be a valid hexadecimal string`,
        "any.required": `"${field}" is a required field`,
    });

export default class GoalValidator {
    public static instance: GoalValidator = new GoalValidator();
    private constructor() {}

    public listQuerySchema = Joi.object({
        status: Joi.string().valid("active", "inactive", "all").default("active").messages({
            "any.only": `"status" must be one of active, inactive, all`,
        }),
        enc: Joi.any().strip(),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public generateGoalSchema = Joi.object({
        goalName: Joi.string()
            .trim()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z0-9\s\-_',.()]+$/)
            .required()
            .messages({
                "string.base": `"goalName" should be a type of 'text'`,
                "string.empty": `"goalName" cannot be empty`,
                "string.min": `"goalName" should have a minimum length of {#limit}`,
                "string.max": `"goalName" should have a maximum length of {#limit}`,
                "string.pattern.base": `"goalName" contains invalid characters`,
                "any.required": `"goalName" is a required field`,
            }),
        goalIcon: Joi.string().trim().uri().optional().messages({
            "string.base": `"goalIcon" should be a type of 'text'`,
            "string.uri": `"goalIcon" must be a valid URL`,
        }),
        goalDescription: Joi.string().trim().max(500).optional().messages({
            "string.base": `"goalDescription" should be a type of 'text'`,
            "string.max": `"goalDescription" should have a maximum length of {#limit}`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updateGoalSchema = Joi.object({
        goalId: idSchema("goalId"),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public createFaqSchema = Joi.object({
        question: Joi.string().trim().min(3).max(300).required().messages({
            "string.base": `"question" should be a type of 'text'`,
            "string.empty": `"question" cannot be empty`,
            "string.min": `"question" should have a minimum length of {#limit}`,
            "string.max": `"question" should have a maximum length of {#limit}`,
            "any.required": `"question" is a required field`,
        }),
        answer: Joi.string().trim().min(3).max(2000).required().messages({
            "string.base": `"answer" should be a type of 'text'`,
            "string.empty": `"answer" cannot be empty`,
            "string.min": `"answer" should have a minimum length of {#limit}`,
            "string.max": `"answer" should have a maximum length of {#limit}`,
            "any.required": `"answer" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updateFaqSchema = Joi.object({
        faqId: idSchema("faqId"),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public createPhysicalIssueSchema = Joi.object({
        physicalIssueName: Joi.string().trim().min(2).max(100).required().messages({
            "string.base": `"physicalIssueName" should be a type of 'text'`,
            "string.empty": `"physicalIssueName" cannot be empty`,
            "string.min": `"physicalIssueName" should have a minimum length of {#limit}`,
            "string.max": `"physicalIssueName" should have a maximum length of {#limit}`,
            "any.required": `"physicalIssueName" is a required field`,
        }),
        physicalIssueIcon: Joi.string().trim().required().messages({
            "string.base": `"physicalIssueIcon" should be a type of 'text'`,
            "string.empty": `"physicalIssueIcon" cannot be empty`,
            "any.required": `"physicalIssueIcon" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updatePhysicalIssueStatus = Joi.object({
        physicalIssueId: idSchema("physicalIssueId"),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public createProfessionSchema = Joi.object({
        professionName: Joi.string().trim().min(2).max(100).required().messages({
            "string.base": `"professionName" should be a type of 'text'`,
            "string.empty": `"professionName" cannot be empty`,
            "string.min": `"professionName" should have a minimum length of {#limit}`,
            "string.max": `"professionName" should have a maximum length of {#limit}`,
            "any.required": `"professionName" is a required field`,
        }),
        professionIcon: Joi.string().trim().required().messages({
            "string.base": `"professionIcon" should be a type of 'text'`,
            "string.empty": `"professionIcon" cannot be empty`,
            "any.required": `"professionIcon" is a required field`,
        }),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });

    public updateProfessionSchema = Joi.object({
        professionId: idSchema("professionId"),
    }).options({ convert: true, abortEarly: true, allowUnknown: false });
}
