import { Router } from "express";
import BannerController from "../controllers/banner.controller";

export default class BannerRoute {
    public static instance: BannerRoute = new BannerRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", BannerController.instance.createBanner.bind(BannerController.instance));
        this.router.get("/list", BannerController.instance.getBanners.bind(BannerController.instance));
        this.router.patch("/update-status", BannerController.instance.updateBannerStatus.bind(BannerController.instance));
        this.router.patch("/update-order", BannerController.instance.updateBannerOrder.bind(BannerController.instance));
        this.router.delete("/:id", BannerController.instance.deleteBanner.bind(BannerController.instance));
    }
}
