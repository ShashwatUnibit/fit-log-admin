import { Router } from "express";
import WorkoutPlanController from "../controllers/workoutPlan.controller";

export default class WorkoutPlanRoute {
    public static instance: WorkoutPlanRoute = new WorkoutPlanRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", WorkoutPlanController.instance.createWorkoutPlan.bind(WorkoutPlanController.instance));
        this.router.get("/list", WorkoutPlanController.instance.getWorkoutPlans.bind(WorkoutPlanController.instance));
        this.router.get("/by-exercise-for/:exerciseFor", WorkoutPlanController.instance.getWorkoutPlanByExerciseFor.bind(WorkoutPlanController.instance));
        this.router.get("/:id", WorkoutPlanController.instance.getWorkoutPlanById.bind(WorkoutPlanController.instance));
        this.router.patch("/:id/toggle-status", WorkoutPlanController.instance.toggleWorkoutPlanStatus.bind(WorkoutPlanController.instance));
        this.router.delete("/:id", WorkoutPlanController.instance.deleteWorkoutPlan.bind(WorkoutPlanController.instance));
    }
}
