import { Types } from "mongoose";
import { eBannerType, eRedirectType } from "../enums/banner.enum";

export interface iBanner {
    _id?: Types.ObjectId;
    imageUrl: string;
    redirectType?: eRedirectType | null;
    redirectValue?: string | null;
    bannerType?: eBannerType | null;
    orderData: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface iBannerOrderItem {
    _id: Types.ObjectId;
    orderData: number;
}

export interface iCreateBannerPayload {
    imageUrl: string;
    redirectType?: eRedirectType | null;
    redirectValue?: string | null;
    bannerType?: eBannerType | null;
    orderData?: number;
}

export interface iUpdateBannerStatusPayload {
    bannerId: string;
    isActive: boolean;
}

export interface iUpdateBannerOrderPayload {
    bannerId: string;
    orderData: number;
}

export interface iBannerListQuery {
    isActive?: boolean;
    bannerType?: eBannerType;
}
