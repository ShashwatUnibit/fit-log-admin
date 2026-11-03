import { Router } from "express";
import NotificationController from "../controllers/notification.controller";
import NotificationTemplateController from "../controllers/notificationTemplate.controller";

export default class NotificationRoute {
    public static instance: NotificationRoute = new NotificationRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        const campaigns = NotificationController.instance;
        const templates = NotificationTemplateController.instance;

        this.router.post("/audience-count", campaigns.getAudienceCount.bind(campaigns));
        this.router.post("/send", campaigns.sendNotification.bind(campaigns));
        this.router.post("/send-test", campaigns.sendTestNotification.bind(campaigns));
        this.router.get("/list", campaigns.listCampaigns.bind(campaigns));

        // Template routes come before "/:id" so "template" is never read as an id
        this.router.post("/template/create", templates.createTemplate.bind(templates));
        this.router.get("/template/list", templates.listTemplates.bind(templates));
        this.router.patch("/template/:id", templates.updateTemplate.bind(templates));
        this.router.delete("/template/:id", templates.deleteTemplate.bind(templates));

        this.router.get("/:id", campaigns.getCampaign.bind(campaigns));
        this.router.post("/:id/cancel", campaigns.cancelCampaign.bind(campaigns));
        this.router.post("/:id/retry", campaigns.retryCampaign.bind(campaigns));
    }
}
