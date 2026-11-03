import type { Request, Response } from "express";
import type { AnyBulkWriteOperation } from "mongoose";
import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";
import { iResponse } from "../interfaces/response.interface";
import {
    iBanner,
    iBannerListQuery,
    iBannerOrderItem,
} from "../interfaces/banner.interface";
import EncryptionSecurity from "../security/encryption.security";
import { toErrorResponse } from "../utils/common.util";
import BannerValidator from "../validators/banner.validator";
import BannerDb from "../db/mongo/banner.mongo";

interface iReplyArgs {
    req: Request;
    res: Response;
}

export default class BannerController {
    public static instance: BannerController = new BannerController();
    private constructor() { }

    public async createBanner(req: Request, res: Response): Promise<void> {
        const validation = BannerValidator.instance.createSchema.validate(req.body ?? {});
        const { error } = validation;
        if (error) {
            this.reject({ req, res }, error.message);
            return;
        }

        try {
            const { imageUrl, redirectType, redirectValue, bannerType, orderData } = validation.value;

            const orderedBanners = await this.getOrderedBanners();
            const position = Math.min(orderData ?? 1, orderedBanners.length + 1);

            const createdBanner = await BannerDb.create({
                imageUrl,
                redirectType: redirectType ?? null,
                redirectValue: redirectValue ?? null,
                bannerType: bannerType ?? null,
                orderData: position,
                isActive: true,
                isDeleted: false,
            });

            orderedBanners.splice(position - 1, 0, { _id: createdBanner._id, orderData: position });
            await this.resequence(orderedBanners);

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Banner created successfully",
                httpCode: eHttpStatusCode.OK,
                data: createdBanner,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async getBanners(req: Request, res: Response): Promise<void> {
        const validation = BannerValidator.instance.listQuerySchema.validate(req.query);
        const { error } = validation;
        if (error) {
            this.reject({ req, res }, error.message);
            return;
        }

        try {
            const { isActive, bannerType } = validation.value as iBannerListQuery;
            const filterQuery: Record<string, unknown> = { isDeleted: false };
            if (typeof isActive === "boolean") {
                filterQuery.isActive = isActive;
            }
            if (bannerType) {
                filterQuery.bannerType = bannerType;
            }

            const banners = await BannerDb.find(filterQuery).sort({ orderData: 1, createdAt: 1 }).lean();

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Banners fetched successfully",
                httpCode: eHttpStatusCode.OK,
                data: banners,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async deleteBanner(req: Request, res: Response): Promise<void> {
        const validation = BannerValidator.instance.idParamSchema.validate(req.params);
        const { error } = validation;
        if (error) {
            this.reject({ req, res }, error.message);
            return;
        }

        try {
            const deletedBanner = await BannerDb.findOneAndUpdate(
                { _id: validation.value.id, isDeleted: false },
                { $set: { isDeleted: true } },
                { new: true }
            ).lean();

            if (!deletedBanner) {
                this.notFound({ req, res });
                return;
            }

            await this.resequence(await this.getOrderedBanners());

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Banner deleted successfully",
                httpCode: eHttpStatusCode.OK,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async updateBannerStatus(req: Request, res: Response): Promise<void> {
        const validation = BannerValidator.instance.updateStatusSchema.validate(req.body ?? {});
        const { error } = validation;
        if (error) {
            this.reject({ req, res }, error.message);
            return;
        }

        try {
            const { bannerId, isActive } = validation.value;
            const banner = await BannerDb.findOneAndUpdate(
                { _id: bannerId, isDeleted: false },
                { $set: { isActive } },
                { new: true }
            ).lean();

            if (!banner) {
                this.notFound({ req, res });
                return;
            }

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: `Banner ${isActive ? "activated" : "deactivated"} successfully`,
                httpCode: eHttpStatusCode.OK,
                data: banner,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    public async updateBannerOrder(req: Request, res: Response): Promise<void> {
        const validation = BannerValidator.instance.updateOrderSchema.validate(req.body ?? {});
        const { error } = validation;
        if (error) {
            this.reject({ req, res }, error.message);
            return;
        }

        try {
            const { bannerId, orderData } = validation.value;
            const orderedBanners = await this.getOrderedBanners();
            const currentIndex = orderedBanners.findIndex((item) => item._id.toString() === bannerId);

            if (currentIndex === -1) {
                this.notFound({ req, res });
                return;
            }

            const [movedBanner] = orderedBanners.splice(currentIndex, 1);
            const position = Math.min(orderData, orderedBanners.length + 1);
            orderedBanners.splice(position - 1, 0, movedBanner);
            await this.resequence(orderedBanners);

            const banners = await BannerDb.find({ isDeleted: false }).sort({ orderData: 1, createdAt: 1 }).lean();

            this.reply({ req, res }, {
                status: eResponseStatus.SUCCESS,
                message: "Banner order updated successfully",
                httpCode: eHttpStatusCode.OK,
                data: banners,
            });
        } catch (err: unknown) {
            this.fail({ req, res }, err);
        }
    }

    /** Non-deleted banners in their current display order (ties broken by creation time). */
    private getOrderedBanners(): Promise<iBannerOrderItem[]> {
        return BannerDb.find({ isDeleted: false })
            .sort({ orderData: 1, createdAt: 1 })
            .select("_id orderData")
            .lean<iBannerOrderItem[]>();
    }

    /**
     * Rewrites orderData to 1..N following the array order, writing only the banners whose
     * position changed. This shifts everything after an insert/move and closes gaps after a delete.
     */
    private async resequence(orderedBanners: iBannerOrderItem[]): Promise<void> {
        const operations: AnyBulkWriteOperation<iBanner>[] = [];
        orderedBanners.forEach((item, index) => {
            if (item.orderData !== index + 1) {
                operations.push({
                    updateOne: {
                        filter: { _id: item._id, isDeleted: false },
                        update: { $set: { orderData: index + 1 } },
                    },
                });
            }
        });

        if (operations.length > 0) {
            await BannerDb.bulkWrite(operations);
        }
    }

    private reply({ req, res }: iReplyArgs, responseData: iResponse): void {
        EncryptionSecurity.instance.onResponse(req, res, responseData);
    }

    private reject({ req, res }: iReplyArgs, message: string): void {
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message, httpCode: eHttpStatusCode.BAD_REQUEST });
    }

    private notFound({ req, res }: iReplyArgs): void {
        this.reply({ req, res }, { status: eResponseStatus.ERROR, message: "Banner not found", httpCode: eHttpStatusCode.NOT_FOUND });
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
