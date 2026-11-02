export interface iTrendPoint {
    date: string;
    count: number;
}

export interface iUserStatCard {
    count: number;
    changePercent: number;
    trend: iTrendPoint[];
}

export interface iUserDashboardStats {
    totalUsers: iUserStatCard & { viaOtp: number; viaGoogle: number };
    incompleteProfileUsers: { count: number };
    activeToday: { count: number; engagementPercent: number };
    premiumUsers: iUserStatCard;
}

export interface iPlatformStat {
    platform: string;
    users: number;
    percent: number;
    latestVersion: string | null;
}

export interface iPlatformDistribution {
    totalDevices: number;
    platforms: iPlatformStat[];
}
