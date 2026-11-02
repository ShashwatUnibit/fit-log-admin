import { Types } from "mongoose";

export interface iGoal {
    _id?: Types.ObjectId;
    goalName?: string;
    goalIcon?: string;
    goalDescription?: string;
    isActive?: boolean;
}

export interface iTopGoalsQuery {
    days: 7 | 30 | 90;
    limit: number;
}

export interface iTopGoalRow {
    _id: Types.ObjectId;
    users: number;
    goal: iGoal;
}

export interface iTopGoalFacets {
    top: iTopGoalRow[];
    total: { n: number }[];
}

export interface iTopGoal {
    rank: number;
    goalId: string;
    goalName: string;
    goalIcon: string | null;
    users: number;
    sharePercent: number;
    barPercent: number;
}

export interface iTopGoals {
    days: number;
    totalUsersWithGoal: number;
    goals: iTopGoal[];
}
