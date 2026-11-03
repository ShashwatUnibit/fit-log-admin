import mongoose, { Model, Schema } from "mongoose";
import { iBanner } from "../../interfaces/banner.interface";
import { cDbNames } from "../../consts/db.const";

type BannerModel = Model<iBanner>;

const BannerSchema = new Schema<iBanner>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        imageUrl: { type: String, required: true, trim: true },
        redirectType: { type: String, required: false, default: null },
        redirectValue: { type: String, required: false, default: null },
        bannerType: { type: String, required: false, default: null },
        orderData: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.banner,
    }
);

const BannerDb: BannerModel = mongoose.model<iBanner>(cDbNames.banner, BannerSchema, cDbNames.banner);

export default BannerDb;
