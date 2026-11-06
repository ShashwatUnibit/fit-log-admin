export type tHealthDays = 7 | 30 | 90;
export type tMealContextFilter = "all" | "fasting" | "before_meal" | "after_meal" | "random";

export interface iHealthSummaryQuery {
    days: tHealthDays;
}

export interface iSugarSummaryQuery extends iHealthSummaryQuery {
    mealContext: tMealContextFilter;
}

export interface iHealthListQuery {
    page: number;
    limit: number;
    // Omitted = all time
    days?: tHealthDays;
}

export interface iSugarListQuery extends iHealthListQuery {
    mealContext: tMealContextFilter;
}

export interface iPeriodLogListQuery {
    page: number;
    limit: number;
}
