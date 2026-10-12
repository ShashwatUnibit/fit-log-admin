import axios from "axios";
import { cEnv } from "../consts/env.const";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";
import {
    iCommonMistakeCorrection,
    iExerciseLevelDetails,
    iHealthProfilePrecaution,
    iStepByStepInstruction,
    iTargetMuscles,
} from "../interfaces/exercise.interface";
import { iYogaDetailsResult, iYogaInstruction } from "../interfaces/yoga.interface";

export interface iExerciseMetricsResult {
    exerciseType: eExerciseType;
    equipmentRequired: string;
    description: string;
    levels: iExerciseLevelDetails[];
    healthProfilePrecaution: iHealthProfilePrecaution;
    targetMuscles: iTargetMuscles;
    stepByStepInstructions: iStepByStepInstruction[];
    commonMistakesAndCorrections: iCommonMistakeCorrection[];
    breathingPattern: string;
}

export interface iMoodInsightsResponse {
    tips: string[];
    affirmation: string;
}

export interface iMenstrualTipsParams {
    phase: "period" | "fertile" | "normal";
    symptoms?: string[];
    profession?: string;
    physicalIssues?: string[];
}

export interface iMenstrualTipsResponse {
    tips: string[];
    remedies?: string[];
}

export interface iMealAnalysisResponse {
    isEdible: boolean;
    mealName: string;
    calories: number;
    message?: string;
}

export default class GeminiService {
    public static instance: GeminiService = new GeminiService();
    private constructor() { }

    public generateExerciseMetrics = async (
        name: string,
        focusPart: eFocusPart
    ): Promise<iExerciseMetricsResult> => {
        const getDefaultMetrics = (): iExerciseMetricsResult => ({
            exerciseType: eExerciseType.STRENGTH,
            equipmentRequired: "None (Bodyweight)",
            description: `${name} is an effective exercise targeting the ${focusPart.toLowerCase()} region. It builds functional strength, muscular endurance, and core stability. Mobility is primarily emphasized in the joints supporting the ${focusPart.toLowerCase()} movement chain. Suitable for general fitness enthusiasts, beginners, and athletes aiming to improve overall conditioning.`,
            healthProfilePrecaution: {
                title: `Caution for individuals with acute ${focusPart.toLowerCase()} or joint issues`,
                description: `High load or poor form can strain the joints and connective tissues supporting the ${focusPart.toLowerCase()} region. Not recommended with acute joint inflammation or recent surgery.`,
                conditions: [`Acute ${focusPart} Pain`, "Tendinitis", "Recent Surgery"],
            },
            targetMuscles: {
                primaryFocus: {
                    name: focusPart,
                    anatomicalName: `${focusPart} Complex`,
                },
                secondaryFocus: ["Core Stabilizers", "Supporting Joints"],
            },
            stepByStepInstructions: [
                {
                    stepNumber: 1,
                    title: "Setup and Stance",
                    description: `Assume a stable, balanced starting position with feet grounded and core braced to support the ${focusPart.toLowerCase()} movement.`,
                    tip: "Maintain a neutral spine and keep your shoulders engaged.",
                },
                {
                    stepNumber: 2,
                    title: "Initiate Movement",
                    description: `Begin the movement with controlled tempo, focusing on feeling tension directly in the ${focusPart.toLowerCase()}.`,
                    tip: "Control the eccentric phase without rushing through the repetition.",
                },
                {
                    stepNumber: 3,
                    title: "Peak Contraction and Reset",
                    description: "Complete the repetition to full contraction, pausing momentarily before returning under control.",
                    tip: "Avoid relying on momentum or hyperextending your joints.",
                },
            ],
            commonMistakesAndCorrections: [
                {
                    avoid: "Using excessive momentum instead of controlled muscle tension",
                    fix: "Slow down each repetition and pause briefly at the peak of the movement.",
                    why: "Momentum shifts the mechanical load away from target muscles and elevates joint shear stress.",
                },
                {
                    avoid: "Allowing core stability and posture to collapse during difficult reps",
                    fix: "Engage your abdominal wall and glutes throughout the full range of motion.",
                    why: "Compromised posture increases vulnerability to spine and connective tissue strain.",
                },
            ],
            breathingPattern: `Inhale deeply during the preparation or lowering phase. Exhale forcefully through pursed lips during the concentric exertion phase of ${name}.`,
            levels: [
                {
                    level: eExerciseLevel.BEGINNER,
                    repetition: 10,
                    sets: 3,
                    restTime: 60,
                    caloriesBurn: 35,
                    durationPerSet: 30,
                    totalTimeToComplete: 210,
                },
                {
                    level: eExerciseLevel.INTERMEDIATE,
                    repetition: 15,
                    sets: 4,
                    restTime: 45,
                    caloriesBurn: 65,
                    durationPerSet: 40,
                    totalTimeToComplete: 295,
                },
                {
                    level: eExerciseLevel.ADVANCED,
                    repetition: 20,
                    sets: 4,
                    restTime: 30,
                    caloriesBurn: 100,
                    durationPerSet: 50,
                    totalTimeToComplete: 290,
                },
                {
                    level: eExerciseLevel.ATHELETE,
                    repetition: 25,
                    sets: 5,
                    restTime: 20,
                    caloriesBurn: 150,
                    durationPerSet: 60,
                    totalTimeToComplete: 380,
                },
            ],
        });

        const apiKey = cEnv.GEMINI_API_KEY;
        if (!apiKey) {
            return getDefaultMetrics();
        }

        const candidateModels = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

        const prompt = `You are a professional fitness coach, physical therapist, and biomechanics expert.
For the exercise "${name}" (Target focus body part: "${focusPart}"):

1. Determine the exercise category type (must be ONE of: "Strength", "Cardio", "Flexibility", "Balance", "HIIT").
2. Determine the exact equipment required for this exercise (e.g., "Barbell & Flat Bench", "Dumbbells", "Pull-up Bar", "None (Bodyweight)", "Gym Mat", "Resistance Band", etc.).
3. Write a comprehensive, well-structured, professional description covering affected areas, mobility focus, suitability, and benefits.
4. Detail the "healthProfilePrecaution":
   - "title" (string): Concise warning heading (e.g. "Not recommended with Shoulder Impingement").
   - "description" (string): Clinical explanation of what position or load strains what joint/capsule, and who should avoid or exercise caution.
   - "conditions" (array of strings): Specific contraindication condition names (e.g. ["Shoulder Impingement", "Rotator Cuff Tear"]).
5. Detail the "targetMuscles":
   - "primaryFocus": An object with:
       - "name" (string): Common muscle name (e.g. "Mid Chest", "Upper Chest", "Lats", "Quadriceps").
       - "anatomicalName" (string): Formal medical/anatomical name (e.g. "Pectoralis Major (Sternal Head)", "Latissimus Dorsi").
   - "secondaryFocus" (array of strings): Secondary muscles and stabilizers recruited (e.g. ["Front Shoulders", "Triceps", "Core & Lats"]).
6. Provide "stepByStepInstructions" (array of 3 to 4 sequential step objects):
   For each step:
   - "stepNumber" (number: 1, 2, 3, 4...).
   - "title" (string: concise step action name, e.g. "Set Your Base & Grip", "Unrack and Stabilize", "Controlled Descent", "Drive & Lockout").
   - "description" (string: precise execution details).
   - "tip" (string: coach tip / pro-cue, e.g. "Retract your shoulder blades and pinch them firmly into the bench.").
7. Provide "commonMistakesAndCorrections" (array of 2 to 3 mistake objects):
   For each mistake:
   - "avoid" (string: mistake label, e.g. "Bouncing bar off the sternum").
   - "fix" (string: actionable solution, e.g. "Pause for half a second at the chest before pressing.").
   - "why" (string: biomechanical rationale, e.g. "Bouncing uses momentum instead of muscle tension and can bruise cartilage or ribs.").
8. Provide "breathingPattern" (string):
   Exact inhalation and exhalation cues during the repetition phases (e.g. "Inhale slowly as you lower the barbell to mid-chest. Exhale powerfully as you press back up.").
9. Calculate realistic exercise metrics for ALL 4 difficulty levels: "Beginner", "Intermediate", "Advanced", and "Athelete".
For each difficulty level, calculate:
- "repetition" (number): Repetitions per set.
- "sets" (number): Total number of sets.
- "restTime" (number): Rest time between sets in seconds.
- "caloriesBurn" (number): Total estimated calories burned for completing all sets.
- "durationPerSet" (number): Time required to perform 1 set in seconds.
- "totalTimeToComplete" (number): Total duration in seconds to finish all sets including rest intervals (calculated as (sets * durationPerSet) + ((sets - 1) * restTime)).

Return ONLY a valid JSON object with the exact keys:
- "exerciseType" (string)
- "equipmentRequired" (string)
- "description" (string)
- "healthProfilePrecaution" (object with title, description, conditions)
- "targetMuscles" (object with primaryFocus { name, anatomicalName }, secondaryFocus string array)
- "stepByStepInstructions" (array of { stepNumber, title, description, tip })
- "commonMistakesAndCorrections" (array of { avoid, fix, why })
- "breathingPattern" (string)
- "levels" (array of 4 objects with { level, repetition, sets, restTime, caloriesBurn, durationPerSet, totalTimeToComplete })`;

        for (const modelName of candidateModels) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            try {
                const response = await axios.post(
                    url,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    },
                    { timeout: 15000 }
                );

                const parts = response.data?.candidates?.[0]?.content?.parts || [];
                let jsonText = "";
                for (const part of parts) {
                    if (part.text && part.text.includes("{")) {
                        jsonText = part.text.trim();
                        break;
                    }
                }

                if (!jsonText) {
                    continue;
                }

                const parsed = JSON.parse(jsonText);

                // Map exerciseType enum
                const validTypes = Object.values(eExerciseType);
                let exerciseType = eExerciseType.STRENGTH;
                if (typeof parsed.exerciseType === "string") {
                    const matchedType = validTypes.find((t) => t.toLowerCase() === parsed.exerciseType.trim().toLowerCase());
                    if (matchedType) {
                        exerciseType = matchedType;
                    }
                }

                // Equipment required
                const equipmentRequired = typeof parsed.equipmentRequired === "string" && parsed.equipmentRequired.trim().length > 0
                    ? parsed.equipmentRequired.trim()
                    : "None (Bodyweight)";

                // Description
                const description = typeof parsed.description === "string" && parsed.description.trim().length > 0
                    ? parsed.description.trim()
                    : getDefaultMetrics().description;

                // Health Profile Precaution
                const healthProfilePrecaution: iHealthProfilePrecaution = {
                    title: typeof parsed?.healthProfilePrecaution?.title === "string" && parsed.healthProfilePrecaution.title.trim().length > 0
                        ? parsed.healthProfilePrecaution.title.trim()
                        : getDefaultMetrics().healthProfilePrecaution.title,
                    description: typeof parsed?.healthProfilePrecaution?.description === "string" && parsed.healthProfilePrecaution.description.trim().length > 0
                        ? parsed.healthProfilePrecaution.description.trim()
                        : getDefaultMetrics().healthProfilePrecaution.description,
                    conditions: Array.isArray(parsed?.healthProfilePrecaution?.conditions) && parsed.healthProfilePrecaution.conditions.length > 0
                        ? parsed.healthProfilePrecaution.conditions.map((c: any) => String(c).trim()).filter(Boolean)
                        : getDefaultMetrics().healthProfilePrecaution.conditions,
                };

                // Target Muscles
                const targetMuscles: iTargetMuscles = {
                    primaryFocus: {
                        name: typeof parsed?.targetMuscles?.primaryFocus?.name === "string" && parsed.targetMuscles.primaryFocus.name.trim().length > 0
                            ? parsed.targetMuscles.primaryFocus.name.trim()
                            : focusPart,
                        anatomicalName: typeof parsed?.targetMuscles?.primaryFocus?.anatomicalName === "string" && parsed.targetMuscles.primaryFocus.anatomicalName.trim().length > 0
                            ? parsed.targetMuscles.primaryFocus.anatomicalName.trim()
                            : `${focusPart} Complex`,
                    },
                    secondaryFocus: Array.isArray(parsed?.targetMuscles?.secondaryFocus) && parsed.targetMuscles.secondaryFocus.length > 0
                        ? parsed.targetMuscles.secondaryFocus.map((s: any) => String(s).trim()).filter(Boolean)
                        : getDefaultMetrics().targetMuscles.secondaryFocus,
                };

                // Step-by-Step Instructions
                const rawInstructions = Array.isArray(parsed?.stepByStepInstructions) && parsed.stepByStepInstructions.length > 0
                    ? parsed.stepByStepInstructions
                    : getDefaultMetrics().stepByStepInstructions;

                const stepByStepInstructions: iStepByStepInstruction[] = rawInstructions.map((step: any, index: number) => ({
                    stepNumber: typeof step.stepNumber === "number" && !isNaN(step.stepNumber) ? step.stepNumber : index + 1,
                    title: typeof step.title === "string" && step.title.trim().length > 0 ? step.title.trim() : `Step ${index + 1}`,
                    description: typeof step.description === "string" && step.description.trim().length > 0 ? step.description.trim() : "",
                    tip: typeof step.tip === "string" ? step.tip.trim() : "",
                }));

                // Common Mistakes & Corrections
                const rawMistakes = Array.isArray(parsed?.commonMistakesAndCorrections) && parsed.commonMistakesAndCorrections.length > 0
                    ? parsed.commonMistakesAndCorrections
                    : getDefaultMetrics().commonMistakesAndCorrections;

                const commonMistakesAndCorrections: iCommonMistakeCorrection[] = rawMistakes.map((item: any) => ({
                    avoid: typeof item.avoid === "string" && item.avoid.trim().length > 0 ? item.avoid.trim() : "Improper Form",
                    fix: typeof item.fix === "string" && item.fix.trim().length > 0 ? item.fix.trim() : "Maintain controlled tempo and proper posture.",
                    why: typeof item.why === "string" && item.why.trim().length > 0 ? item.why.trim() : "Reduces strain and maximizes muscle activation.",
                }));

                // Breathing Pattern
                const breathingPattern = typeof parsed.breathingPattern === "string" && parsed.breathingPattern.trim().length > 0
                    ? parsed.breathingPattern.trim()
                    : getDefaultMetrics().breathingPattern;

                // Levels
                const levelsArr = parsed?.levels;
                const validLevels = Object.values(eExerciseLevel);
                const mappedLevels: iExerciseLevelDetails[] = validLevels.map((lvl) => {
                    const found = Array.isArray(levelsArr) ? levelsArr.find((item: any) => {
                        const itemLvl = String(item.level || "").toLowerCase().trim();
                        const targetLvl = String(lvl).toLowerCase().trim();
                        return itemLvl === targetLvl || (targetLvl === "athelete" && itemLvl === "athlete");
                    }) : null;

                    if (found) {
                        const sets = typeof found.sets === "number" && !isNaN(found.sets) ? Math.max(1, Math.round(found.sets)) : 3;
                        const repetition = typeof found.repetition === "number" && !isNaN(found.repetition) ? Math.max(1, Math.round(found.repetition)) : 10;
                        const restTime = typeof found.restTime === "number" && !isNaN(found.restTime) ? Math.max(0, Math.round(found.restTime)) : 45;
                        const caloriesBurn = typeof found.caloriesBurn === "number" && !isNaN(found.caloriesBurn) ? Math.max(0, Math.round(found.caloriesBurn)) : 50;
                        const durationPerSet = typeof found.durationPerSet === "number" && !isNaN(found.durationPerSet) ? Math.max(1, Math.round(found.durationPerSet)) : 30;
                        const calculatedTotal = (sets * durationPerSet) + ((sets - 1) * restTime);
                        const totalTimeToComplete = typeof found.totalTimeToComplete === "number" && !isNaN(found.totalTimeToComplete) && found.totalTimeToComplete > 0
                            ? Math.round(found.totalTimeToComplete)
                            : calculatedTotal;

                        return {
                            level: lvl,
                            repetition,
                            sets,
                            restTime,
                            caloriesBurn,
                            durationPerSet,
                            totalTimeToComplete,
                        };
                    }
                    return getDefaultMetrics().levels.find((d) => d.level === lvl)!;
                });

                return {
                    exerciseType,
                    equipmentRequired,
                    description,
                    healthProfilePrecaution,
                    targetMuscles,
                    stepByStepInstructions,
                    commonMistakesAndCorrections,
                    breathingPattern,
                    levels: mappedLevels,
                };
            } catch (error: unknown) {
                console.warn(`GeminiService generateExerciseMetrics with model ${modelName} failed, trying next candidate:`, error);
            }
        }

        console.error("All Gemini API models failed in generateExerciseMetrics, returning fallback metrics");
        return getDefaultMetrics();
    };


    public generateYogaDetails = async (input: {
        englishName?: string;
        sanskritName?: string;
    }): Promise<iYogaDetailsResult> => {
        const queryName = input.englishName?.trim() || input.sanskritName?.trim() || "Yoga Asana";
        const providedEnglish = input.englishName?.trim();
        const providedSanskrit = input.sanskritName?.trim();

        const getDefaultYoga = (): iYogaDetailsResult => ({
            englishName: providedEnglish || "Mountain Pose",
            sanskritName: providedSanskrit || "Tadasana",
            sanskritNamePhonetic: "tah-DAHS-anna",
            description: `${queryName} is a foundational posture that improves alignment, balance, and mindful breathing. It grounds the body while gently stretching and strengthening key muscle groups.`,
            benefits: [
                "Improves posture, body alignment, and spatial awareness",
                "Strengthens thighs, knees, and ankles",
                "Firms abdomen and glutes while relieving spinal tension",
                "Calms the nervous system and fosters mental stillness",
                "Enhances balance, core stability, and steady breathing"
            ],
            instructions: [
                {
                    stepNumber: 1,
                    instruction: "Stand with big toes touching and heels slightly apart, distributing weight evenly across both feet.",
                    breathCue: "Inhale deeply to lengthen the spine"
                },
                {
                    stepNumber: 2,
                    instruction: "Engage your thighs, lift your kneecaps, and draw the tailbone slightly downward while lifting the chest.",
                    breathCue: "Exhale to relax your shoulders down and away from your ears"
                },
                {
                    stepNumber: 3,
                    instruction: "Extend through the crown of your head, let arms rest alongside your torso with palms forward, and hold steady.",
                    breathCue: "Breathe deeply and smoothly in and out through the nose"
                }
            ],
            defaultHoldDurationSeconds: 30,
            recommendedRepitition: 3,
            timeTakenPerRepetition: 60,
            totalTimeTaken: 190,
            propsRequired: ["Yoga Mat"],
            breathingGuidance: "Maintain steady, rhythmic Ujjayi breathing through the nose, keeping the throat soft and the breath smooth, balanced, and uninterrupted."
        });

        const apiKey = cEnv.GEMINI_API_KEY;
        if (!apiKey) {
            return getDefaultYoga();
        }

        const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];

        let prompt = `You are a certified master yoga instructor (RYT 500), physical therapist, and Sanskrit scholar.
Generate a comprehensive, anatomically accurate, and traditional yoga posture profile based on the following input:
`;
        if (providedEnglish) {
            prompt += `- English Name: "${providedEnglish}"\n`;
        }
        if (providedSanskrit) {
            prompt += `- Sanskrit Name: "${providedSanskrit}"\n`;
        }

        prompt += `
Identify the exact yoga asana corresponding to this input. If both names are given, use them. If only one name is provided, accurately determine its official counterpart in the other language.

CRITICAL TIMING & DESCRIPTION INSTRUCTIONS:
1. DESCRIPTION MUST BE CONCISE: Strictly 2 to 3 sentences (maximum 45-50 words). Summarize the posture's essence, key alignment focus, and energetic feeling clearly and punchily. Avoid long, overly dense paragraphs.
2. TIMING BASED ON AUDIO READOUT & PERFORMANCE: A mobile application will read out each step and breath cue at a normal, clear conversational speed (approx. 130-140 words/min) so the user can easily listen and perform each action step-by-step.
   - "timeTakenPerRepetition" (number, in seconds): Total realistic duration for 1 repetition. This MUST account for the audio readout of all instructional steps plus natural buffer pauses for the user to position and adjust themselves, PLUS holding the posture for "defaultHoldDurationSeconds".
   - "totalTimeTaken" (number, in seconds): Total duration to perform the complete session with "recommendedRepitition" repetitions. Calculated as (timeTakenPerRepetition * recommendedRepitition) plus 5 to 10 seconds of brief resting/reset intervals between repetitions.

Return ONLY a valid JSON object matching this exact structure:
{
  "englishName": string (e.g. "Downward-Facing Dog"),
  "sanskritName": string (traditional name in standard Romanized Sanskrit, e.g. "Adho Mukha Svanasana"),
  "sanskritNamePhonetic": string (phonetic pronunciation guide, e.g. "AH-doh MOO-kah shvah-NAHS-anna"),
  "description": string (concise, 2 to 3 sentences max, up to 50 words),
  "benefits": string[] (array of 4 to 6 clear, evidence-backed physical, physiological, or mental health benefits),
  "instructions": [
    {
      "stepNumber": number (1, 2, 3, etc.),
      "instruction": string (clear, actionable step-by-step cue),
      "breathCue": string (associated breath instruction, e.g. "Inhale deeply as you lengthen...", "Exhale fully as you fold...")
    }
  ],
  "defaultHoldDurationSeconds": number (recommended hold duration in seconds, e.g. 30, 45, or 60),
  "recommendedRepitition": number (recommended repetitions, e.g. 1, 3, or 5),
  "timeTakenPerRepetition": number (time in seconds for 1 repetition including audio instruction readout and pose hold),
  "totalTimeTaken": number (total time in seconds for recommended repetitions including rest between repetitions),
  "propsRequired": string[] (array of helpful or required props, e.g. ["Yoga Mat", "Yoga Blocks", "Strap"]),
  "breathingGuidance": string (clear guidance on pranayama and breathing rhythm during the pose)
}
`;

        for (const modelName of candidateModels) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            try {
                const response = await axios.post(
                    url,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    },
                    { timeout: 7500 }
                );

                const parts = response.data?.candidates?.[0]?.content?.parts || [];
                let jsonText = "";
                for (const part of parts) {
                    if (part.text && part.text.includes("{")) {
                        jsonText = part.text.trim();
                        break;
                    }
                }

                if (!jsonText) {
                    continue;
                }

                const parsed = JSON.parse(jsonText);
                const defaultYoga = getDefaultYoga();

                const englishName = typeof parsed.englishName === "string" && parsed.englishName.trim().length > 0
                    ? parsed.englishName.trim()
                    : defaultYoga.englishName;

                const sanskritName = typeof parsed.sanskritName === "string" && parsed.sanskritName.trim().length > 0
                    ? parsed.sanskritName.trim()
                    : defaultYoga.sanskritName;

                const sanskritNamePhonetic = typeof parsed.sanskritNamePhonetic === "string" && parsed.sanskritNamePhonetic.trim().length > 0
                    ? parsed.sanskritNamePhonetic.trim()
                    : defaultYoga.sanskritNamePhonetic;

                const description = typeof parsed.description === "string" && parsed.description.trim().length > 0
                    ? parsed.description.trim()
                    : defaultYoga.description;

                const benefits = Array.isArray(parsed.benefits) && parsed.benefits.length > 0
                    ? parsed.benefits.map((b: any) => String(b).trim()).filter(Boolean)
                    : defaultYoga.benefits;

                let instructions: iYogaInstruction[] = [];
                if (Array.isArray(parsed.instructions) && parsed.instructions.length > 0) {
                    instructions = parsed.instructions.map((inst: any, idx: number) => ({
                        stepNumber: typeof inst.stepNumber === "number" ? inst.stepNumber : idx + 1,
                        instruction: typeof inst.instruction === "string" ? inst.instruction.trim() : "",
                        breathCue: typeof inst.breathCue === "string" ? inst.breathCue.trim() : "",
                    })).filter((i: any) => i.instruction.length > 0);
                }
                if (instructions.length === 0) {
                    instructions = defaultYoga.instructions;
                }

                const defaultHoldDurationSeconds = typeof parsed.defaultHoldDurationSeconds === "number" && !isNaN(parsed.defaultHoldDurationSeconds) && parsed.defaultHoldDurationSeconds > 0
                    ? Math.round(parsed.defaultHoldDurationSeconds)
                    : defaultYoga.defaultHoldDurationSeconds;

                const recommendedRepitition = typeof parsed.recommendedRepitition === "number" && !isNaN(parsed.recommendedRepitition) && parsed.recommendedRepitition > 0
                    ? Math.round(parsed.recommendedRepitition)
                    : defaultYoga.recommendedRepitition;

                // Calculated fallback based on audio speech rate (approx 2.2 words/sec) + 3s buffer per step + hold duration
                const totalInstructionWords = instructions.reduce((acc, curr) => {
                    const instWords = curr.instruction.split(/\s+/).filter(Boolean).length;
                    const cueWords = curr.breathCue ? curr.breathCue.split(/\s+/).filter(Boolean).length : 0;
                    return acc + instWords + cueWords;
                }, 0);
                const audioReadoutAndExecutionSeconds = Math.round((totalInstructionWords / 2.2) + (instructions.length * 3));
                const calculatedTimePerRep = audioReadoutAndExecutionSeconds + defaultHoldDurationSeconds;

                const timeTakenPerRepetition = typeof parsed.timeTakenPerRepetition === "number" && !isNaN(parsed.timeTakenPerRepetition) && parsed.timeTakenPerRepetition > defaultHoldDurationSeconds
                    ? Math.round(parsed.timeTakenPerRepetition)
                    : Math.max(30, calculatedTimePerRep);

                const calculatedTotalTime = (timeTakenPerRepetition * recommendedRepitition) + ((recommendedRepitition - 1) * 10);

                const totalTimeTaken = typeof parsed.totalTimeTaken === "number" && !isNaN(parsed.totalTimeTaken) && parsed.totalTimeTaken >= timeTakenPerRepetition
                    ? Math.round(parsed.totalTimeTaken)
                    : Math.max(timeTakenPerRepetition, calculatedTotalTime);

                const propsRequired = Array.isArray(parsed.propsRequired) && parsed.propsRequired.length > 0
                    ? parsed.propsRequired.map((p: any) => String(p).trim()).filter(Boolean)
                    : defaultYoga.propsRequired;

                const breathingGuidance = typeof parsed.breathingGuidance === "string" && parsed.breathingGuidance.trim().length > 0
                    ? parsed.breathingGuidance.trim()
                    : defaultYoga.breathingGuidance;

                return {
                    englishName,
                    sanskritName,
                    sanskritNamePhonetic,
                    description,
                    benefits,
                    instructions,
                    defaultHoldDurationSeconds,
                    recommendedRepitition,
                    timeTakenPerRepetition,
                    totalTimeTaken,
                    propsRequired,
                    breathingGuidance,
                };
            } catch (error: unknown) {
                console.warn(`GeminiService generateYogaDetails with model ${modelName} failed, trying next candidate:`, error);
            }
        }

        console.error("All Gemini API models failed in generateYogaDetails, returning fallback yoga profile");
        return getDefaultYoga();
    };
}

