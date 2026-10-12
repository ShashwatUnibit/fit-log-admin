import { Router } from "express";
import ExerciseController from "../controllers/exercise.controller";

export default class ExerciseRoute {
    public static instance: ExerciseRoute = new ExerciseRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/create", ExerciseController.instance.createExercise.bind(ExerciseController.instance));
        this.router.get("/list", ExerciseController.instance.getExercises.bind(ExerciseController.instance));
        this.router.get("/:id", ExerciseController.instance.getExerciseById.bind(ExerciseController.instance));
    }
}

