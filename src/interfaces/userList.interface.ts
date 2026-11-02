export type tUserListFilter = "all" | "active" | "inactive" | "premium";

export interface iUserListQuery {
    page: number;
    filter: tUserListFilter;
    search?: string;
}

export interface iUserListItem {
    _id: string;
    fullName: string | null;
    mobile: string | null;
    email: string | null;
    age: number | null;
    gender: string | null;
    height: number | null;
    heightUnit: string | null;
    weight: number | null;
    weightUnit: string | null;
    bmi: number | null;
    goalId: string | null;
    goalName: string | null;
    isPremium: boolean;
    plan: "VIP Premium" | "Free";
    isActive: boolean;
    status: "Active" | "Inactive";
    isRegistrationCompleted: boolean;
    createdAt: Date | null;
}

export interface iUserStatusPayload {
    isActive: boolean;
}

export interface iUserList {
    users: iUserListItem[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}
