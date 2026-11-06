// Clinical alert thresholds. "critical" = needs prompt medical attention, "high" = abnormal, needs review.
// Sources: ADA Standards of Care (glucose, mg/dL), AHA/ACC 2017 (blood pressure, mmHg), resting heart rate (bpm).
export const cAlertThresholds = {
    heartRate: {
        criticalLow: 40,
        criticalHigh: 150,
        highLow: 50,
        highHigh: 120,
        restingLow: 60,
        restingHigh: 100,
    },
    bloodPressure: {
        criticalSystolicHigh: 180,
        criticalDiastolicHigh: 120,
        criticalSystolicLow: 80,
        criticalDiastolicLow: 50,
        highSystolicHigh: 140,
        highDiastolicHigh: 90,
        highSystolicLow: 90,
        highDiastolicLow: 60,
        elevatedSystolic: 120,
        stage1Systolic: 130,
        stage1Diastolic: 80,
    },
    bloodSugar: {
        criticalLow: 54,
        criticalFastingHigh: 200,
        criticalPostMealHigh: 300,
        highLow: 70,
        highFastingHigh: 126,
        highPostMealHigh: 200,
        fastingContexts: ["fasting", "before_meal"],
        fastingElevated: 100,
        postMealElevated: 140,
    },
};

export const ALERTS_PAGE_SIZE = 15;

export const DEFAULT_STEPS_GOAL = 7000;
export const DEFAULT_WATER_GOAL_GLASSES = 8;
