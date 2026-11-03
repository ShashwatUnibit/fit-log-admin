import { Router } from "express";
import GoalController from "../controllers/goal.controller";

export default class GoalRoute {
    public static instance: GoalRoute = new GoalRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get("/goals", GoalController.instance.getAllGoals.bind(GoalController.instance));
        this.router.post("/create/goals", GoalController.instance.createGoal.bind(GoalController.instance));
        this.router.put("/update/goals/:goalId", GoalController.instance.updateGoalStatus.bind(GoalController.instance));

        this.router.get("/faqs", GoalController.instance.getFaqs.bind(GoalController.instance));
        this.router.post("/create/faq", GoalController.instance.createFaq.bind(GoalController.instance));
        this.router.put("/update/faq/:faqId", GoalController.instance.updateFaqStatus.bind(GoalController.instance));

        this.router.get("/professions", GoalController.instance.getProfessions.bind(GoalController.instance));
        this.router.post("/create/professions", GoalController.instance.createProfession.bind(GoalController.instance));
        this.router.put("/update/professions/:professionId", GoalController.instance.updateProfessionStatus.bind(GoalController.instance));

        this.router.get("/physicalIssues", GoalController.instance.getPhysicalIssues.bind(GoalController.instance));
        this.router.post("/create/physicalIssue", GoalController.instance.createPhysicalIssue.bind(GoalController.instance));
        this.router.put("/update/physicalIssue/:physicalIssueId", GoalController.instance.updatePhysicalIssueStatus.bind(GoalController.instance));
    }
}
