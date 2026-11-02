import { Router } from "express";
import DashboardController from "../controllers/dashboard.controller";

export default class DashboardRoute {
    public static instance: DashboardRoute = new DashboardRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get("/user-stats", DashboardController.instance.getUserStats.bind(DashboardController.instance));
        this.router.get("/platform-distribution", DashboardController.instance.getPlatformDistribution.bind(DashboardController.instance));
        this.router.get("/top-goals", DashboardController.instance.getTopGoals.bind(DashboardController.instance));
        this.router.get("/critical-alerts", DashboardController.instance.getCriticalAlerts.bind(DashboardController.instance));
        this.router.get("/telemetry-activity", DashboardController.instance.getTelemetryActivity.bind(DashboardController.instance));
    }
}
