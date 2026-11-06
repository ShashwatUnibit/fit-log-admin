import { Router } from "express";
import UserController from "../controllers/user.controller";
import UserActivityController from "../controllers/userActivity.controller";
import UserDietPlanController from "../controllers/userDietPlan.controller";
import UserMenstrualController from "../controllers/userMenstrual.controller";
import UserVitalsController from "../controllers/userVitals.controller";
import UserWorkoutPlanController from "../controllers/userWorkoutPlan.controller";

export default class UserRoute {
    public static instance: UserRoute = new UserRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/action", UserController.instance.performUserAction.bind(UserController.instance));
        this.router.get("/list", UserController.instance.getUserList.bind(UserController.instance));
        this.router.get("/:id/overview", UserController.instance.getUserOverview.bind(UserController.instance));
        this.router.get("/:id/workout-plans", UserWorkoutPlanController.instance.getWorkoutPlanHistory.bind(UserWorkoutPlanController.instance));
        this.router.get("/:id/diet-plans", UserDietPlanController.instance.getDietPlanHistory.bind(UserDietPlanController.instance));
        const vitals = UserVitalsController.instance;
        this.router.get("/:id/vitals/blood-pressure/summary", vitals.getBloodPressureSummary.bind(vitals));
        this.router.get("/:id/vitals/blood-pressure/readings", vitals.getBloodPressureReadings.bind(vitals));
        this.router.get("/:id/vitals/blood-sugar/summary", vitals.getBloodSugarSummary.bind(vitals));
        this.router.get("/:id/vitals/blood-sugar/readings", vitals.getBloodSugarReadings.bind(vitals));
        this.router.get("/:id/vitals/heart-rate/summary", vitals.getHeartRateSummary.bind(vitals));
        this.router.get("/:id/vitals/heart-rate/readings", vitals.getHeartRateReadings.bind(vitals));

        const activity = UserActivityController.instance;
        this.router.get("/:id/activity/summary", activity.getActivitySummary.bind(activity));
        this.router.get("/:id/activity/daily", activity.getActivityDaily.bind(activity));
        this.router.get("/:id/mood/summary", activity.getMoodSummary.bind(activity));
        this.router.get("/:id/mood/entries", activity.getMoodEntries.bind(activity));

        const menstrual = UserMenstrualController.instance;
        this.router.get("/:id/menstrual", menstrual.getMenstrualOverview.bind(menstrual));
        this.router.get("/:id/menstrual/period-logs", menstrual.getPeriodLogs.bind(menstrual));
        this.router.patch("/:id/status", UserController.instance.updateUserStatus.bind(UserController.instance));
    }
}
