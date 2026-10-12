import { Router } from "express";
import AuthController from "../controllers/auth.controller";

export default class AuthRoute {
    public static instance: AuthRoute = new AuthRoute();
    public router: Router = Router();
    private constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/login", AuthController.instance.adminLogin.bind(AuthController.instance));
        this.router.post("/auto-login", AuthController.instance.adminAutoLogin.bind(AuthController.instance));
    }
}
