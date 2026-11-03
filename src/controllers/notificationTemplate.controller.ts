import type { Request, Response } from "express";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import NotificationValidator from "../validators/notification.validator";
import NotificationTemplateDb from "../db/mongo/notificationTemplate.mongo";

interface iReplyArgs {
    req: Request;
    res: Response;
}

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

export default class NotificationTemplateController {
    public static instance: NotificationTemplateController = new NotificationTemplateController();
    private constructor() { }

    public async createTemplate(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.templateCreateSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const payload = validation.value;
            if (await this.nameExists({ name: payload.name })) {
                this.reject({ req, res }, "A template with this name already exists");
                return;
            }

            const template = await NotificationTemplateDb.create({
                name: payload.name,
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl ?? null,
                screen: payload.screen ?? null,
                url: payload.url ?? null,
                isDeleted: false,
            });

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Template created successfully",
                httpCode: eHttpStatusCode.OK,
                data: template,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async listTemplates(req: Request, res: Response): Promise<void> {
        try {
            const templates = await NotificationTemplateDb.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Templates fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: templates,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async updateTemplate(req: Request, res: Response): Promise<void> {
        const idValidation = NotificationValidator.instance.idParamSchema.validate(req.params);
        if (idValidation.error) {
            this.reject({ req, res }, idValidation.error.message);
            return;
        }
        const validation = NotificationValidator.instance.templateUpdateSchema.validate(req.body ?? {});
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const { id } = idValidation.value;
            const changes = validation.value;
            if (changes.name && await this.nameExists({ name: changes.name, excludeId: id })) {
                this.reject({ req, res }, "A template with this name already exists");
                return;
            }

            const template = await NotificationTemplateDb.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { $set: changes },
                { new: true }
            ).lean();

            if (!template) {
                this.notFound({ req, res });
                return;
            }
            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Template updated successfully",
                httpCode: eHttpStatusCode.OK,
                data: template,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async deleteTemplate(req: Request, res: Response): Promise<void> {
        const validation = NotificationValidator.instance.idParamSchema.validate(req.params);
        if (validation.error) {
            this.reject({ req, res }, validation.error.message);
            return;
        }

        try {
            const template = await NotificationTemplateDb.findOneAndUpdate(
                { _id: validation.value.id, isDeleted: false },
                { $set: { isDeleted: true } },
                { new: true }
            ).lean();

            if (!template) {
                this.notFound({ req, res });
                return;
            }
            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Template deleted successfully",
                httpCode: eHttpStatusCode.OK,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    private async nameExists({ name, excludeId }: { name: string; excludeId?: string }): Promise<boolean> {
        const existing = await NotificationTemplateDb.exists({
            name: new RegExp(`^${name.replace(REGEX_SPECIAL_CHARS, "\\$&")}$`, "i"),
            isDeleted: false,
            ...(excludeId && { _id: { $ne: excludeId } }),
        });
        return existing !== null;
    }

    private reply({ req, res }: iReplyArgs, responseData: iResponse): void {
        EncryptionSecurity.instance.onResponse(req, res, responseData);
    }

    private reject({ req, res }: iReplyArgs, message: string): void {
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message, httpCode: eHttpStatusCode.BAD_REQUEST });
    }

    private notFound({ req, res }: iReplyArgs): void {
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message: "Template not found", httpCode: eHttpStatusCode.NOT_FOUND });
    }

    private fail({ req, res }: iReplyArgs, err: unknown): void {
        const errorRes = toErrorResponse(err);
        this.reply({ req, res }, {
            status: eResponseStatus.FAIL,
            message: errorRes.message,
            httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
        });
    }
}
