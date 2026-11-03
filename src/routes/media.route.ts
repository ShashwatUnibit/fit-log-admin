import { Router } from "express";
import MediaController from "../controllers/media.controller";

export default class MediaRoute {
    public static instance: MediaRoute = new MediaRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/image", MediaController.instance.imageUpload.bind(MediaController.instance));
        this.router.post("/pdf", MediaController.instance.pdfUpload.bind(MediaController.instance));
        this.router.post("/video", MediaController.instance.videoUpload.bind(MediaController.instance));
    }
}
