import { Router } from "express";
import DataController from "../controllers/data.controller";

export default class DataRoute {
    public static instance: DataRoute = new DataRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.get("/test", DataController.instance.getData.bind(DataController.instance));
        this.router.get("/static-data", DataController.instance.getStaticData.bind(DataController.instance));
    }
}
