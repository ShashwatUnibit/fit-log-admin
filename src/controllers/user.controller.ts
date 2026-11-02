import type { Request, Response } from "express";
import type { QueryFilter, Types } from "mongoose";
import DietaryRestrictionDb from "../db/mongo/dietaryRestriction.mongo";
import FoodAllergyDb from "../db/mongo/foodAllergy.mongo";
import FoodIntoleranceDb from "../db/mongo/foodIntolerance.mongo";
import FoodPreferenceDb from "../db/mongo/foodPreference.mongo";
import GoalDb from "../db/mongo/goals.mongo";
import PhysicalIssueDb from "../db/mongo/physicalIssue.mongo";
import ProfessionDb from "../db/mongo/profession.mongo";
import UserWorkoutPlanDb from "../db/mongo/userWorkoutPlan.mongo";
import UserDb from "../db/mongo/users.mongo";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { eUserActionPurpose } from "../enums/userAction.enum";
import { iResponse } from "../interfaces/response.interface";
import { iUsers } from "../interfaces/user.interface";
import { iNamedRef, iUserOverview } from "../interfaces/userOverview.interface";
import { iUserActionPayload, iUserList, iUserListQuery, iUserStatusPayload } from "../interfaces/userList.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import UserValidator from "../validators/user.validator";

const PAGE_LIMIT = 15;
const USER_ACTIONS: Record<eUserActionPurpose, { update: { isActive?: boolean; isPremium?: boolean; fcmToken?: null }; message: string }> = {
    [eUserActionPurpose.DEACTIVATE_PROFILE]: { update: { isActive: false }, message: "User profile deactivated successfully" },
    [eUserActionPurpose.ACTIVATE_PROFILE]: { update: { isActive: true }, message: "User profile activated successfully" },
    [eUserActionPurpose.GRANT_PREMIUM]: { update: { isPremium: true }, message: "Premium granted successfully" },
    [eUserActionPurpose.REVOKE_PREMIUM]: { update: { isPremium: false }, message: "Premium revoked successfully" },
    [eUserActionPurpose.CLEAR_FCM]: { update: { fcmToken: null }, message: "FCM token cleared successfully" },
};
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

export default class UserController {
    public static instance: UserController = new UserController();
    private constructor() {}

    public async getUserList(req: Request, res: Response): Promise<void> {
        const result = UserValidator.instance.userListQuerySchema.validate(req.query);
        if (result.error) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: result.error.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const data = await this.buildUserList(result.value);
            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "Users fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        } catch (err: unknown) {
            const errorRes = toErrorResponse(err);
            const responseData: iResponse = {
                status: eResponseStatus.FAIL,
                message: errorRes.message ?? "Internal server error",
                httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        }
    }

    public async updateUserStatus(req: Request, res: Response): Promise<void> {
        const paramsResult = UserValidator.instance.userIdParamSchema.validate(req.params);
        const bodyResult = UserValidator.instance.userStatusSchema.validate(req.body ?? {});
        const validationError = paramsResult.error ?? bodyResult.error;
        if (validationError) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: validationError.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const { id } = req.params as { id: string };
            const { isActive } = req.body as iUserStatusPayload;
            const user = await UserDb.findOneAndUpdate(
                { _id: id, isDeleted: { $ne: true } },
                { $set: { isActive } },
                { new: true }
            ).lean();

            if (!user) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "User not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: isActive ? "User activated successfully" : "User deactivated successfully",
                httpCode: eHttpStatusCode.OK,
                data: { _id: String(user._id), isActive, status: isActive ? "Active" : "Inactive" },
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        } catch (err: unknown) {
            const errorRes = toErrorResponse(err);
            const responseData: iResponse = {
                status: eResponseStatus.FAIL,
                message: errorRes.message ?? "Internal server error",
                httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        }
    }

    public async getUserOverview(req: Request, res: Response): Promise<void> {
        const paramsResult = UserValidator.instance.userIdParamSchema.validate(req.params);
        if (paramsResult.error) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: paramsResult.error.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const { id } = req.params as { id: string };
            const data = await this.buildUserOverview(id);
            if (!data) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "User not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: "User overview fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        } catch (err: unknown) {
            const errorRes = toErrorResponse(err);
            const responseData: iResponse = {
                status: eResponseStatus.FAIL,
                message: errorRes.message ?? "Internal server error",
                httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        }
    }

    private async buildUserOverview(id: string): Promise<iUserOverview | null> {
        const user = await UserDb.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
        if (!user) {
            return null;
        }

        const issueIds = user.physicalIssues ?? [];
        const allergyIds = user.foodAllergyIds ?? [];
        const intoleranceIds = user.foodIntoleranceIds ?? [];
        const restrictionIds = user.dietaryRestrictionIds ?? [];
        const [goal, profession, issues, preference, allergies, intolerances, restrictions, activePlanCount] = await Promise.all([
            user.goal ? GoalDb.findById(user.goal).select("goalName").lean() : null,
            user.profession ? ProfessionDb.findById(user.profession).select("professionName").lean() : null,
            issueIds.length ? PhysicalIssueDb.find({ _id: { $in: issueIds } }).select("physicalIssueName").lean() : [],
            user.foodPreferenceId ? FoodPreferenceDb.findById(user.foodPreferenceId).select("title").lean() : null,
            allergyIds.length ? FoodAllergyDb.find({ _id: { $in: allergyIds.map(String) } }).select("title").lean() : [],
            intoleranceIds.length ? FoodIntoleranceDb.find({ _id: { $in: intoleranceIds.map(String) } }).select("title").lean() : [],
            restrictionIds.length ? DietaryRestrictionDb.find({ _id: { $in: restrictionIds.map(String) } }).select("title").lean() : [],
            UserWorkoutPlanDb.countDocuments({ userId: user._id, isActive: true, isDeleted: { $ne: true } }),
        ]);

        const isActive = user.isActive !== false;
        const isPremium = user.isPremium === true;
        const isRegistrationCompleted = user.isRegistrationCompleted === true;
        const userId = String(user._id);
        const bmi = user.bmi === undefined ? null : Math.round(user.bmi * 100) / 100;

        return {
            header: {
                userId,
                fullName: user.fullName ?? null,
                email: user.email ?? null,
                mobile: user.mobile ?? null,
                profilePic: user.profilePic ?? null,
                isActive,
                status: isActive ? "Active" : "Inactive",
                isPremium,
                plan: isPremium ? "VIP Premium" : "Free",
                isRegistrationCompleted,
            },
            summary: {
                bmi: { value: bmi, category: this.bmiCategory(bmi) },
                currentWeight: { value: user.weight ?? null, unit: user.weightUnit ?? null },
                targetWeight: { value: user.targetWeight ?? null, unit: user.weightUnit ?? null, timeframeWeeks: user.targetTimeframe ?? null },
                exerciseCommitment: { daysPerWeek: user.exerciseDaysPerWeek ?? null, minutesPerDay: user.exerciseTimePerDay ?? null },
                planPeriod: { startDate: user.startWorkoutPlanDate ?? null, endDate: user.endWorkoutPlanDate ?? null },
            },
            account: {
                userId,
                mobile: user.mobile ?? null,
                email: user.email ?? null,
                fcmToken: user.fcmToken ?? null,
                createdAt: user.createdAt ?? null,
                updatedAt: user.updatedAt ?? null,
            },
            biometrics: {
                age: user.age ?? null,
                gender: user.gender ?? null,
                height: { value: user.height ?? null, unit: user.heightUnit ?? null },
                weight: { value: user.weight ?? null, unit: user.weightUnit ?? null },
                bmi,
                menstrualProfileExists: user.doesMenstrualProfileExist === true,
                physicalIssues: this.namedRefs(issueIds, issues.map((i) => ({ id: String(i._id), name: i.physicalIssueName }))),
            },
            goalAndProfession: {
                goal: user.goal ? { id: String(user.goal), name: goal?.goalName ?? null } : null,
                profession: user.profession ? { id: String(user.profession), name: profession?.professionName ?? null } : null,
                // A plan the user built themselves sets hasCustomizedWorkoutPlan; otherwise an active plan is AI generated.
                aiGeneratedWorkoutPlan: activePlanCount > 0 && user.hasCustomizedWorkoutPlan !== true,
                isRegistrationCompleted,
            },
            activityPreferences: {
                activityLevel: user.regularPhysicalActivity || null,
                preferredExerciseTime: user.preferredTimeForExercise || null,
                exerciseDays: user.exerciseDays ?? [],
                stepsGoal: user.stepsGoal ?? null,
                waterGoalGlasses: user.goalWaterIntake ?? null,
                targetTimeframeWeeks: user.targetTimeframe ?? null,
            },
            nutritionProfile: {
                foodPreference: user.foodPreferenceId ? { id: String(user.foodPreferenceId), name: preference?.title ?? null } : null,
                foodAllergies: this.namedRefs(allergyIds, allergies.map((a) => ({ id: String(a._id), name: a.title }))),
                foodIntolerances: this.namedRefs(intoleranceIds, intolerances.map((i) => ({ id: String(i._id), name: i.title }))),
                dietaryRestrictions: this.namedRefs(restrictionIds, restrictions.map((r) => ({ id: String(r._id), name: r.title }))),
            },
        };
    }

    /** Keeps the user's selection order; an id whose document no longer exists keeps a null name. */
    private namedRefs(ids: Types.ObjectId[], found: { id: string; name?: string }[]): iNamedRef[] {
        const names = new Map(found.map((f) => [f.id, f.name ?? null]));
        return ids.map((id) => ({ id: String(id), name: names.get(String(id)) ?? null }));
    }

    /** WHO adult BMI classification. */
    private bmiCategory(bmi: number | null): string | null {
        if (bmi === null) {
            return null;
        }
        if (bmi < 18.5) {
            return "Underweight";
        }
        if (bmi < 25) {
            return "Normal";
        }
        return bmi < 30 ? "Overweight" : "Obese";
    }

    public async performUserAction(req: Request, res: Response): Promise<void> {
        const bodyResult = UserValidator.instance.userActionSchema.validate(req.body ?? {});
        if (bodyResult.error) {
            const responseData: iResponse = {
                status: eResponseStatus.ERROR,
                message: bodyResult.error.message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
            return;
        }

        try {
            const { userId, purpose } = req.body as iUserActionPayload;
            const action = USER_ACTIONS[purpose];
            const user = await UserDb.findOneAndUpdate(
                { _id: userId, isDeleted: { $ne: true } },
                { $set: action.update },
                { new: true }
            ).lean();

            if (!user) {
                const responseData: iResponse = {
                    status: eResponseStatus.ERROR,
                    message: "User not found",
                    httpCode: eHttpStatusCode.NOT_FOUND,
                };
                EncryptionSecurity.instance.onResponse(req, res, responseData);
                return;
            }

            const isActive = user.isActive !== false;
            const isPremium = user.isPremium === true;
            const responseData: iResponse = {
                status: eResponseStatus.SUCCESS,
                message: action.message,
                httpCode: eHttpStatusCode.OK,
                data: {
                    userId: String(user._id),
                    purpose,
                    isActive,
                    status: isActive ? "Active" : "Inactive",
                    isPremium,
                    plan: isPremium ? "VIP Premium" : "Free",
                    hasFcmToken: Boolean(user.fcmToken),
                },
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        } catch (err: unknown) {
            const errorRes = toErrorResponse(err);
            const responseData: iResponse = {
                status: eResponseStatus.FAIL,
                message: errorRes.message ?? "Internal server error",
                httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
            };
            EncryptionSecurity.instance.onResponse(req, res, responseData);
        }
    }

    private buildFilter(query: iUserListQuery): QueryFilter<iUsers> {
        const filter: QueryFilter<iUsers> = { isDeleted: { $ne: true } };
        // A user with no isActive value is treated as active.
        if (query.filter === "active") {
            filter.isActive = { $ne: false };
        } else if (query.filter === "inactive") {
            filter.isActive = false;
        } else if (query.filter === "premium") {
            filter.isPremium = true;
        }

        const search = query.search?.trim();
        if (search) {
            const pattern = new RegExp(search.replace(REGEX_SPECIAL_CHARS, "\\$&"), "i");
            filter.$or = [{ fullName: pattern }, { email: pattern }, { mobile: pattern }];
        }
        return filter;
    }

    private async buildUserList(query: iUserListQuery): Promise<iUserList> {
        const filter = this.buildFilter(query);
        const [totalItems, users] = await Promise.all([
            UserDb.countDocuments(filter),
            UserDb.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((query.page - 1) * PAGE_LIMIT)
                .limit(PAGE_LIMIT)
                .lean(),
        ]);

        const goalIds = users.flatMap((u) => (u.goal ? [u.goal] : []));
        const goals = goalIds.length ? await GoalDb.find({ _id: { $in: goalIds } }).select("goalName").lean() : [];
        const goalNames = new Map(goals.map((g) => [String(g._id), g.goalName ?? null]));

        return {
            users: users.map((u) => {
                const isActive = u.isActive !== false;
                const isPremium = u.isPremium === true;
                return {
                    _id: String(u._id),
                    fullName: u.fullName ?? null,
                    mobile: u.mobile ?? null,
                    email: u.email ?? null,
                    age: u.age ?? null,
                    gender: u.gender ?? null,
                    height: u.height ?? null,
                    heightUnit: u.heightUnit ?? null,
                    weight: u.weight ?? null,
                    weightUnit: u.weightUnit ?? null,
                    bmi: u.bmi === undefined ? null : Math.round(u.bmi * 100) / 100,
                    goalId: u.goal ? String(u.goal) : null,
                    goalName: u.goal ? (goalNames.get(String(u.goal)) ?? null) : null,
                    isPremium,
                    plan: isPremium ? "VIP Premium" : "Free",
                    isActive,
                    status: isActive ? "Active" : "Inactive",
                    isRegistrationCompleted: u.isRegistrationCompleted === true,
                    createdAt: u.createdAt ?? null,
                };
            }),
            pagination: { page: query.page, limit: PAGE_LIMIT, totalItems, totalPages: Math.ceil(totalItems / PAGE_LIMIT) },
        };
    }
}
