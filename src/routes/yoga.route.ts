import { Router } from "express";
import YogaController from "../controllers/yoga.controller";

export default class YogaRoute {
    public static instance: YogaRoute = new YogaRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", YogaController.instance.createYoga.bind(YogaController.instance));
        this.router.get("/list", YogaController.instance.getYogas.bind(YogaController.instance));
        this.router.get("/:id", YogaController.instance.getYogaById.bind(YogaController.instance));
    }
}
