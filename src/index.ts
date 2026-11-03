import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { cEnv } from "./consts/env.const";
import { eHttpStatusCode, eResponseStatus } from "./enums/server.enum";
import { iResponse } from "./interfaces/response.interface";
import MongoDB from "./db/mongo/db.mongo";

import CronJobsService from "./services/cron.service";
import AuthRoute from "./routes/auth.route";
import DataRoute from "./routes/data.route";
import FoodPreferenceRoute from "./routes/foodPreference.route";
import FoodAllergyRoute from "./routes/foodAllergy.route";
import FoodIntoleranceRoute from "./routes/foodIntolerance.route";
import DietaryRestrictionRoute from "./routes/dietaryRestriction.route";
import ExerciseRoute from "./routes/exercise.route";
import WorkoutPlanRoute from "./routes/workoutPlan.route";
import YogaRoute from "./routes/yoga.route";
import AdminRoute from "./routes/admin.route";
import DashboardRoute from "./routes/dashboard.route";
import UserRoute from "./routes/user.route";
import GoalRoute from "./routes/goal.route";
import MediaRoute from "./routes/media.route";
import BannerRoute from "./routes/banner.route";
import NotificationRoute from "./routes/notification.route";
import EncryptionSecurity from "./security/encryption.security";
import AuthSecurity from "./security/auth.security";

// Initialize MongoDB connection
MongoDB.instance.connect().catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
});

//Initialize Cron
CronJobsService.instance.initializeCronJobs();

const app = express();

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "app-id", "x-app-id", "app-version", "x-app-version", "platform", "x-app-platform", "hash", "x-access-token", "app-type", "x-user-id", "x-session-id", "x-server-key"],
        exposedHeaders: ["x-access-token", "Authorization"],
        optionsSuccessStatus: 200,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any, max-params
app.use((err: any, req: Request, res: Response, next: NextFunction): Response | null => {
    if (err) {
        const finalResponse: iResponse = {
            status: eResponseStatus.ERROR,
            message: "Invalid JSON payload",
        };
        return res.status(eHttpStatusCode.BAD_REQUEST).json(finalResponse);
    }
    next();
    return null;
});

// eslint-disable-next-line max-params
app.use((req, res, next) => EncryptionSecurity.instance.onRequest(req, res, next));

// Routes
app.use("/api/v1/auth", AuthSecurity.instance.validateAppId.bind(AuthSecurity.instance), AuthRoute.instance.router);
app.use("/api/v1/data", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), DataRoute.instance.router);
app.use("/api/v1/food-preference", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), FoodPreferenceRoute.instance.router);
app.use("/api/v1/food-allergy", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), FoodAllergyRoute.instance.router);
app.use("/api/v1/food-intolerance", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), FoodIntoleranceRoute.instance.router);
app.use("/api/v1/dietary-restriction", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), DietaryRestrictionRoute.instance.router);
app.use("/api/v1/exercise", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), ExerciseRoute.instance.router);
app.use("/api/v1/workout-plan", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), WorkoutPlanRoute.instance.router);
app.use("/api/v1/yoga", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), YogaRoute.instance.router);
app.use("/api/v1/admin", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), AdminRoute.instance.router);
app.use("/api/v1/dashboard", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), DashboardRoute.instance.router);
app.use("/api/v1/app", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), GoalRoute.instance.router);
app.use("/api/v1/users", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), UserRoute.instance.router);
app.use("/api/v1/upload", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), MediaRoute.instance.router);
app.use("/api/v1/banner", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), BannerRoute.instance.router);
app.use("/api/v1/notification", AuthSecurity.instance.validateToken.bind(AuthSecurity.instance), NotificationRoute.instance.router);

app.use(async (req: Request, res: Response) => {
    console.log(`Received request: ${req.method} ${req.originalUrl}`);

    const response: iResponse = {
        status: eResponseStatus.ERROR,
        message: "Route not found",
    };

    return res.status(eHttpStatusCode.NOT_FOUND).json(response);
});

app.listen(cEnv.PORT, () => {
    console.log(`Proxy server is running on ${cEnv.PORT}`);
});

