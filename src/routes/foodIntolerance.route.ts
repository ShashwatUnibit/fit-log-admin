import { Router } from "express";
import FoodIntoleranceController from "../controllers/foodIntolerance.controller";

export default class FoodIntoleranceRoute {
    public static instance: FoodIntoleranceRoute = new FoodIntoleranceRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", FoodIntoleranceController.instance.createFoodIntolerance.bind(FoodIntoleranceController.instance));
    }
}
