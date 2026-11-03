import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Request, Response } from "express";
import multer from "multer";
import { cEnv } from "../consts/env.const";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";

interface iMediaConfig {
    field: string;
    folder: string;
    label: string;
    maxSizeMb: number;
    isAllowedMime: (mimetype: string) => boolean;
}

const MB = 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120000;

const mediaConfigs = {
    image: {
        field: "image",
        folder: "images",
        label: "image",
        maxSizeMb: 5,
        isAllowedMime: (mimetype: string): boolean => mimetype.startsWith("image/"),
    },
    pdf: {
        field: "pdf",
        folder: "pdfs",
        label: "PDF",
        maxSizeMb: 10,
        isAllowedMime: (mimetype: string): boolean => mimetype === "application/pdf",
    },
    video: {
        field: "video",
        folder: "videos",
        label: "video",
        maxSizeMb: 100,
        isAllowedMime: (mimetype: string): boolean => mimetype.startsWith("video/"),
    },
} satisfies Record<string, iMediaConfig>;

export default class MediaController {
    public static instance: MediaController = new MediaController();
    private readonly s3Client: S3Client;

    private constructor() {
        this.s3Client = new S3Client({
            region: cEnv.DIGITAL_OCEAN_SPACES_REGION,
            endpoint: cEnv.DIGITAL_OCEAN_SPACES_ENDPOINT,
            credentials: {
                accessKeyId: cEnv.DIGITAL_OCEAN_ACCESS_KEY ?? "",
                secretAccessKey: cEnv.DIGITAL_OCEAN_SPACES_SECRET ?? "",
            },
        });
    }

    public async imageUpload(req: Request, res: Response): Promise<void> {
        await this.handleUpload({ req, res, config: mediaConfigs.image });
    }

    public async pdfUpload(req: Request, res: Response): Promise<void> {
        await this.handleUpload({ req, res, config: mediaConfigs.pdf });
    }

    public async videoUpload(req: Request, res: Response): Promise<void> {
        await this.handleUpload({ req, res, config: mediaConfigs.video });
    }

    private respond({ req, res }: { req: Request; res: Response }, responseData: iResponse): void {
        EncryptionSecurity.instance.onResponse(req, res, responseData);
    }

    private parseFile({ req, res, config }: { req: Request; res: Response; config: iMediaConfig }): Promise<void> {
        const uploader = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: config.maxSizeMb * MB, files: 1 },
            // eslint-disable-next-line max-params
            fileFilter: (_req, file, cb): void => {
                if (config.isAllowedMime(file.mimetype)) {
                    cb(null, true);
                    return;
                }
                cb(new Error(`Invalid file type. Only ${config.label} files are allowed.`));
            },
        }).single(config.field);

        return new Promise<void>((resolve, reject) => {
            uploader(req, res, (err: unknown) => {
                if (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                    return;
                }
                resolve();
            });
        });
    }

    private async handleUpload({ req, res, config }: { req: Request; res: Response; config: iMediaConfig }): Promise<void> {
        try {
            await this.parseFile({ req, res, config });
        } catch (err: unknown) {
            const isTooLarge = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
            this.respond({ req, res }, {
                status: eResponseStatus.ERROR,
                message: isTooLarge
                    ? `File size limit exceeded. Maximum allowed size is ${config.maxSizeMb}MB.`
                    : (err as Error).message,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            });
            return;
        }

        const { file } = req;
        if (!file) {
            this.respond({ req, res }, {
                status: eResponseStatus.ERROR,
                message: `No ${config.label} uploaded. Send it as multipart/form-data in the "${config.field}" field.`,
                httpCode: eHttpStatusCode.BAD_REQUEST,
            });
            return;
        }

        const { DIGITAL_OCEAN_SPACES_BUCKET: bucket, DIGITAL_OCEAN_SPACES_BASE_URL: baseUrl } = cEnv;
        if (!bucket || !baseUrl) {
            console.error("Media upload is not configured: missing Spaces bucket or base URL");
            this.respond({ req, res }, {
                status: eResponseStatus.FAIL,
                message: "Media storage is not configured",
                httpCode: eHttpStatusCode.INTERNAL_SERVER_ERROR,
            });
            return;
        }

        try {
            const safeName = file.originalname.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
            const key = `${cEnv.SERVER_ENV}/fit-log-admin/${config.folder}/${Date.now()}-${safeName}`;

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    ACL: "public-read",
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    ContentLength: file.size,
                }),
                { abortSignal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS) },
            );

            this.respond({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "File uploaded successfully",
                httpCode: eHttpStatusCode.OK,
                data: { url: `${baseUrl}${key}` },
            });
        } catch (err: unknown) {
            console.error("Error uploading file:", err);
            const errorRes = toErrorResponse(err);
            this.respond({ req, res }, {
                status: eResponseStatus.FAIL,
                message: errorRes.message,
                httpCode: errorRes.statusCode || eHttpStatusCode.INTERNAL_SERVER_ERROR,
            });
        }
    }
}
