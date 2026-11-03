import mongoose, { Model, Schema } from "mongoose";
import { iAppConfig, iCompanyPolicies, iForceUpdate, iForceUpdateEntry } from "../../interfaces/appConfig.interface";
import { cDbNames } from "../../consts/db.const";
import { eAppPlatform } from "../../enums/appConfig.enum";

type AppConfigModel = Model<iAppConfig>;

// No schema defaults on purpose: a version document must hold only the fields it overrides, and the
// user app merges it over the base shallowly, so a default (even null) would override the base value.
const companyPoliciesSchema = new Schema<iCompanyPolicies>(
    {
        termsAndConditions: { type: String, required: true, trim: true },
        privacyPolicy: { type: String, required: true, trim: true },
        aboutUs: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const forceUpdateEntrySchema = new Schema<iForceUpdateEntry>(
    {
        enabled: { type: Boolean, required: true },
        minVersion: { type: String, default: null },
    },
    { _id: false }
);

const forceUpdateSchema = new Schema<iForceUpdate>(
    {
        maintananceMode: { type: Boolean, required: true },
        forceUpdateForPlatforms: {
            ios: { type: forceUpdateEntrySchema, required: true },
            android: { type: forceUpdateEntrySchema, required: true },
        },
    },
    { _id: false }
);

const AppConfigSchema = new Schema<iAppConfig>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        appName: { type: String, trim: true },
        appVersion: { type: String, required: true, trim: true },
        platform: { type: String, enum: Object.values(eAppPlatform), required: true, trim: true },
        companyPolicies: { type: companyPoliciesSchema },
        forceUpdate: { type: forceUpdateSchema },
        forceUpdateMessage: { type: String, trim: true },
        supportEmail: { type: String, trim: true, lowercase: true },
        supportPhone: { type: String, trim: true },
        playStoreUrl: { type: String, trim: true },
        appStoreUrl: { type: String, trim: true },
        apkDownloadUrl: { type: String, trim: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.appConfig,
    }
);

AppConfigSchema.index({ platform: 1, appVersion: 1 }, { unique: true });

const AppConfigDb: AppConfigModel = mongoose.model<iAppConfig>(cDbNames.appConfig, AppConfigSchema, cDbNames.appConfig);

export default AppConfigDb;
