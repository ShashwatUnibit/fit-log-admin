import { Router } from "express";
import DietaryRestrictionController from "../controllers/dietaryRestriction.controller";

export default class DietaryRestrictionRoute {
    public static instance: DietaryRestrictionRoute = new DietaryRestrictionRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", DietaryRestrictionController.instance.createDietaryRestriction.bind(DietaryRestrictionController.instance));
    }
}
