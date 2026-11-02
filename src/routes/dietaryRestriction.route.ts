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
        this.router.get("/list", DietaryRestrictionController.instance.getDietaryRestrictionList.bind(DietaryRestrictionController.instance));
        this.router.patch("/:id", DietaryRestrictionController.instance.updateDietaryRestriction.bind(DietaryRestrictionController.instance));
        this.router.delete("/:id", DietaryRestrictionController.instance.deleteDietaryRestriction.bind(DietaryRestrictionController.instance));
    }
}
