import { Router } from "express";
import AppConfigController from "../controllers/appConfig.controller";

export default class AppConfigRoute {
    public static instance: AppConfigRoute = new AppConfigRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        const controller = AppConfigController.instance;

        this.router.get("/list", controller.listConfigs.bind(controller));
        this.router.get("/effective", controller.getEffective.bind(controller));
        this.router.get("/history", controller.getHistory.bind(controller));
        this.router.post("/create", controller.createConfig.bind(controller));
        this.router.patch("/maintenance", controller.setMaintenance.bind(controller));
        this.router.patch("/otp", controller.setOtp.bind(controller));
        this.router.post("/force-update/bulk", controller.bulkForceUpdate.bind(controller));
        this.router.post("/history/:id/restore", controller.restoreHistory.bind(controller));

        // Routes with an id come after the fixed paths above
        this.router.patch("/:id/force-update", controller.setForceUpdate.bind(controller));
        this.router.patch("/:id", controller.updateConfig.bind(controller));
        this.router.delete("/:id", controller.deleteConfig.bind(controller));
    }
}
