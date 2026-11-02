import { Router } from "express";
import AdminController from "../controllers/admin.controller";

export default class AdminRoute {
    public static instance: AdminRoute = new AdminRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/add", AdminController.instance.addAdmin.bind(AdminController.instance));
    }
}
