import { Router } from "express";
import FoodPreferenceController from "../controllers/foodPreference.controller";

export default class FoodPreferenceRoute {
    public static instance: FoodPreferenceRoute = new FoodPreferenceRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", FoodPreferenceController.instance.createFoodPreference.bind(FoodPreferenceController.instance));
    }
}
