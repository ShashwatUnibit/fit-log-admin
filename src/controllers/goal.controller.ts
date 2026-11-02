import type { Request, Response } from "express";
import type { QueryFilter } from "mongoose";
import GoalDb from "../db/mongo/goals.mongo";
import PhysicalIssueDb from "../db/mongo/physicalIssue.mongo";
import ProfessionDb from "../db/mongo/profession.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iGoal } from "../interfaces/goal.interface";
import { iPhysicalIssue } from "../interfaces/physicalIssue.interface";
import { iProfession } from "../interfaces/profession.interface";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import GoalValidator from "../validators/goal.validator";

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

export default class GoalController {
    public static instance: GoalController = new GoalController();
    private constructor() {}

    // ---------- Goals ----------

    public async createGoal(req: Request, res: Response): Promise<void> {
        const { error } = GoalValidator.instance.generateGoalSchema.validate(req.body ?? {});
        if (error) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: error.message, httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const { goalName, goalIcon, goalDescription } = req.body as { goalName: string; goalIcon?: string; goalDescription?: string };

            const existingGoal = await GoalDb.findOne({ goalName: this.exactName(goalName) }).lean();
            if (existingGoal) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: `Goal named '${goalName}' already exists.`, httpCode: eHttpStatusCode.CONFLICT } });
                return;
            }

            const goalData: Omit<iGoal, "_id"> = {
                goalName: goalName.trim(),
                goalIcon: goalIcon ?? "",
                goalDescription: goalDescription ?? "",
                isActive: true,
            };
            const createdGoal = await GoalDb.create(goalData);

            this.send({ req, res, data: { status: eResponseStatus.SUCCESS, message: "Goal created successfully.", httpCode: eHttpStatusCode.OK, data: createdGoal } });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    public async getAllGoals(req: Request, res: Response): Promise<void> {
        const filter = this.parseListFilter(req);
        if (!filter) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: this.listError(req), httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const goals = await GoalDb.find(filter).lean();
            if (goals.length === 0) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: "No Goals are present at the moment. Please try again.", httpCode: eHttpStatusCode.NOT_FOUND } });
                return;
            }
            this.send({ req, res, data: { status: eResponseStatus.SUCCESS, message: "Goals fetched successfully.", httpCode: eHttpStatusCode.OK, data: goals } });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    public async updateGoalStatus(req: Request, res: Response): Promise<void> {
        const { error } = GoalValidator.instance.updateGoalSchema.validate(req.params);
        if (error) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: error.message, httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const { goalId } = req.params as { goalId: string };
            const goal = await GoalDb.findById(goalId);
            if (!goal) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: "Goal not found.", httpCode: eHttpStatusCode.NOT_FOUND } });
                return;
            }

            goal.isActive = !goal.isActive;
            await goal.save();

            this.send({
                req,
                res,
                data: {
                    status: eResponseStatus.SUCCESS,
                    message: `Goal status updated successfully. Goal is now ${goal.isActive ? "active" : "inactive"}.`,
                    httpCode: eHttpStatusCode.OK,
                    data: goal,
                },
            });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    // ---------- Physical issues ----------

    public async createPhysicalIssue(req: Request, res: Response): Promise<void> {
        const { error } = GoalValidator.instance.createPhysicalIssueSchema.validate(req.body ?? {});
        if (error) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: error.message, httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const { physicalIssueName, physicalIssueIcon } = req.body as { physicalIssueName: string; physicalIssueIcon: string };

            const existingIssue = await PhysicalIssueDb.findOne({ physicalIssueName: this.exactName(physicalIssueName) }).lean();
            if (existingIssue) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: `Physical issue '${physicalIssueName}' already exists.`, httpCode: eHttpStatusCode.CONFLICT } });
                return;
            }

            const issueData: Omit<iPhysicalIssue, "_id"> = {
                physicalIssueName: physicalIssueName.trim(),
                physicalIssueIcon: physicalIssueIcon.trim(),
                isActive: true,
            };
            const createdIssue = await PhysicalIssueDb.create(issueData);

            this.send({ req, res, data: { status: eResponseStatus.SUCCESS, message: "Physical issue created successfully.", httpCode: eHttpStatusCode.OK, data: createdIssue } });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    public async getPhysicalIssues(req: Request, res: Response): Promise<void> {
        const filter = this.parseListFilter(req);
        if (!filter) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: this.listError(req), httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const physicalIssues = await PhysicalIssueDb.find(filter).lean();
            if (physicalIssues.length === 0) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: "No Physical Issues are present at the moment. Please try again.", httpCode: eHttpStatusCode.NOT_FOUND } });
                return;
            }
            this.send({ req, res, data: { status: eResponseStatus.SUCCESS, message: "Physical issues fetched successfully.", httpCode: eHttpStatusCode.OK, data: physicalIssues } });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    public async updatePhysicalIssueStatus(req: Request, res: Response): Promise<void> {
        const { error } = GoalValidator.instance.updatePhysicalIssueStatus.validate(req.params);
        if (error) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: error.message, httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const { physicalIssueId } = req.params as { physicalIssueId: string };
            const physicalIssue = await PhysicalIssueDb.findById(physicalIssueId);
            if (!physicalIssue) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: "Physical issue not found.", httpCode: eHttpStatusCode.NOT_FOUND } });
                return;
            }

            physicalIssue.isActive = !physicalIssue.isActive;
            await physicalIssue.save();

            this.send({
                req,
                res,
                data: {
                    status: eResponseStatus.SUCCESS,
                    message: `Physical issue status updated successfully. Physical issue is now ${physicalIssue.isActive ? "active" : "inactive"}.`,
                    httpCode: eHttpStatusCode.OK,
                    data: physicalIssue,
                },
            });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    // ---------- Professions ----------

    public async createProfession(req: Request, res: Response): Promise<void> {
        const { error } = GoalValidator.instance.createProfessionSchema.validate(req.body ?? {});
        if (error) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: error.message, httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const { professionName, professionIcon } = req.body as { professionName: string; professionIcon: string };

            const existingProfession = await ProfessionDb.findOne({ professionName: this.exactName(professionName) }).lean();
            if (existingProfession) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: `Profession '${professionName}' already exists.`, httpCode: eHttpStatusCode.CONFLICT } });
                return;
            }

            const professionData: Omit<iProfession, "_id"> = {
                professionName: professionName.trim(),
                professionIcon: professionIcon.trim(),
                isActive: true,
            };
            const createdProfession = await ProfessionDb.create(professionData);

            this.send({ req, res, data: { status: eResponseStatus.SUCCESS, message: "Profession created successfully.", httpCode: eHttpStatusCode.OK, data: createdProfession } });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    public async getProfessions(req: Request, res: Response): Promise<void> {
        const filter = this.parseListFilter(req);
        if (!filter) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: this.listError(req), httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const professions = await ProfessionDb.find(filter).lean();
            if (professions.length === 0) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: "No Professions are present at the moment. Please try again.", httpCode: eHttpStatusCode.NOT_FOUND } });
                return;
            }
            this.send({ req, res, data: { status: eResponseStatus.SUCCESS, message: "Professions fetched successfully.", httpCode: eHttpStatusCode.OK, data: professions } });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    public async updateProfessionStatus(req: Request, res: Response): Promise<void> {
        const { error } = GoalValidator.instance.updateProfessionSchema.validate(req.params);
        if (error) {
            this.send({ req, res, data: { status: eResponseStatus.ERROR, message: error.message, httpCode: eHttpStatusCode.BAD_REQUEST } });
            return;
        }

        try {
            const { professionId } = req.params as { professionId: string };
            const profession = await ProfessionDb.findById(professionId);
            if (!profession) {
                this.send({ req, res, data: { status: eResponseStatus.ERROR, message: "Profession not found.", httpCode: eHttpStatusCode.NOT_FOUND } });
                return;
            }

            profession.isActive = !profession.isActive;
            await profession.save();

            this.send({
                req,
                res,
                data: {
                    status: eResponseStatus.SUCCESS,
                    message: `Profession status updated successfully. Profession is now ${profession.isActive ? "active" : "inactive"}.`,
                    httpCode: eHttpStatusCode.OK,
                    data: profession,
                },
            });
        } catch (err: unknown) {
            this.sendFailure({ req, res, err });
        }
    }

    // ---------- helpers ----------

    /** Case-insensitive exact match; regex characters in the name are escaped. */
    private exactName(name: string): RegExp {
        return new RegExp(`^${name.trim().replace(REGEX_SPECIAL_CHARS, "\\$&")}$`, "i");
    }

    /** Builds the isActive filter from `?status=` (default `active`, as in the user app); null when invalid. */
    private parseListFilter(req: Request): QueryFilter<{ isActive: boolean }> | null {
        const result = GoalValidator.instance.listQuerySchema.validate(req.query);
        if (result.error) {
            return null;
        }
        const { status } = result.value as { status: "active" | "inactive" | "all" };
        if (status === "all") {
            return {};
        }
        return { isActive: status === "active" };
    }

    private listError(req: Request): string {
        return GoalValidator.instance.listQuerySchema.validate(req.query).error?.message ?? "Invalid query";
    }

    private send(params: { req: Request; res: Response; data: iResponse }): void {
        EncryptionSecurity.instance.onResponse(params.req, params.res, params.data);
    }

    private sendFailure(params: { req: Request; res: Response; err: unknown }): void {
        const errorRes = toErrorResponse(params.err);
        this.send({
            req: params.req,
            res: params.res,
            data: {
                status: eResponseStatus.FAIL,
                message: errorRes.message ?? "Internal server error",
                httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
            },
        });
    }
}
