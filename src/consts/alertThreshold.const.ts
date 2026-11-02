// Clinical alert thresholds. "critical" = needs prompt medical attention, "high" = abnormal, needs review.
// Sources: ADA Standards of Care (glucose, mg/dL), AHA/ACC 2017 (blood pressure, mmHg), resting heart rate (bpm).
export const cAlertThresholds = {
    heartRate: {
        criticalLow: 40,
        criticalHigh: 150,
        highLow: 50,
        highHigh: 120,
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
    },
    bloodSugar: {
        criticalLow: 54,
        criticalFastingHigh: 200,
        criticalPostMealHigh: 300,
        highLow: 70,
        highFastingHigh: 126,
        highPostMealHigh: 200,
        fastingContexts: ["fasting", "before_meal"],
    },
};

export const ALERTS_PAGE_SIZE = 15;
