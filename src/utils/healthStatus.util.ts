import { cAlertThresholds } from "../consts/alertThreshold.const";

export type tHealthStatus = "Low" | "Normal" | "Elevated" | "High";

/** "after_meal" becomes "After meal". */
export function humanize(value: string): string {
    return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** AHA/ACC 2017 categories; Low uses the same cut-offs as the critical-alerts feed. */
export function bloodPressureStatus(params: { systolic: number; diastolic: number }): tHealthStatus {
    const { systolic, diastolic } = params;
    const t = cAlertThresholds.bloodPressure;
    if (systolic < t.highSystolicLow || diastolic < t.highDiastolicLow) {
        return "Low";
    }
    if (systolic >= t.stage1Systolic || diastolic >= t.stage1Diastolic) {
        return "High";
    }
    return systolic >= t.elevatedSystolic ? "Elevated" : "Normal";
}

/** ADA ranges: fasting/before-meal vs post-meal (also used for "random"). */
export function bloodSugarStatus(params: { value: number; mealContext?: string }): tHealthStatus {
    const { value, mealContext } = params;
    const t = cAlertThresholds.bloodSugar;
    if (value < t.highLow) {
        return "Low";
    }
    const isFasting = mealContext !== undefined && t.fastingContexts.includes(mealContext);
    const high = isFasting ? t.highFastingHigh : t.highPostMealHigh;
    const elevated = isFasting ? t.fastingElevated : t.postMealElevated;
    if (value >= high) {
        return "High";
    }
    return value >= elevated ? "Elevated" : "Normal";
}

export function heartRateStatus(bpm: number): tHealthStatus {
    const t = cAlertThresholds.heartRate;
    if (bpm < t.restingLow) {
        return "Low";
    }
    return bpm > t.restingHigh ? "High" : "Normal";
}

export type tMoodSentiment = "positive" | "neutral" | "negative" | "unknown";

// The moods the user app can log, in the order the admin panel shows them.
export const cMoodSentiments: Record<string, Exclude<tMoodSentiment, "unknown">> = {
    happy: "positive",
    excited: "positive",
    energetic: "positive",
    neutral: "neutral",
    sad: "negative",
    stressed: "negative",
    anxious: "negative",
};

export function moodSentiment(mood: string): tMoodSentiment {
    return cMoodSentiments[mood] ?? "unknown";
}
