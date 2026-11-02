import { Router } from "express";
import UserController from "../controllers/user.controller";
import UserDietPlanController from "../controllers/userDietPlan.controller";
import UserWorkoutPlanController from "../controllers/userWorkoutPlan.controller";

export default class UserRoute {
    public static instance: UserRoute = new UserRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get("/list", UserController.instance.getUserList.bind(UserController.instance));
        this.router.get("/:id/overview", UserController.instance.getUserOverview.bind(UserController.instance));
        this.router.get("/:id/workout-plans", UserWorkoutPlanController.instance.getWorkoutPlanHistory.bind(UserWorkoutPlanController.instance));
        this.router.get("/:id/diet-plans", UserDietPlanController.instance.getDietPlanHistory.bind(UserDietPlanController.instance));
        this.router.patch("/:id/status", UserController.instance.updateUserStatus.bind(UserController.instance));
    }
}
