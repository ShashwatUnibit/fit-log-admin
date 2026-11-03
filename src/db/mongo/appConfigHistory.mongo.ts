import mongoose, { Model, Schema } from "mongoose";
import { iAppConfigChange, iAppConfigHistory } from "../../interfaces/appConfig.interface";
import { cDbNames } from "../../consts/db.const";
import { eAppConfigAction, eAppPlatform } from "../../enums/appConfig.enum";

type AppConfigHistoryModel = Model<iAppConfigHistory>;

const changeSchema = new Schema<iAppConfigChange>(
    {
        path: { type: String, required: true },
        before: { type: Schema.Types.Mixed },
        after: { type: Schema.Types.Mixed },
    },
    { _id: false }
);

const AppConfigHistorySchema = new Schema<iAppConfigHistory>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        configId: { type: Schema.Types.ObjectId, required: true },
        platform: { type: String, enum: Object.values(eAppPlatform), required: true },
        appVersion: { type: String, required: true },
        action: { type: String, enum: Object.values(eAppConfigAction), required: true },
        changes: { type: [changeSchema], default: [] },
        snapshot: { type: Schema.Types.Mixed, default: {} },
        changedBy: { type: Schema.Types.ObjectId, required: true },
        changedByName: { type: String, default: null },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
        collection: cDbNames.appConfigHistory,
        minimize: false,
    }
);

AppConfigHistorySchema.index({ createdAt: -1 });
AppConfigHistorySchema.index({ configId: 1, createdAt: -1 });

const AppConfigHistoryDb: AppConfigHistoryModel = mongoose.model<iAppConfigHistory>(
    cDbNames.appConfigHistory,
    AppConfigHistorySchema,
    cDbNames.appConfigHistory
);

export default AppConfigHistoryDb;
