import { Router } from "express";
import FoodAllergyController from "../controllers/foodAllergy.controller";

export default class FoodAllergyRoute {
    public static instance: FoodAllergyRoute = new FoodAllergyRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", FoodAllergyController.instance.createFoodAllergy.bind(FoodAllergyController.instance));
    }
}
