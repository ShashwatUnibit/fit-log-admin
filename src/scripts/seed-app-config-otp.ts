import mongoose from "mongoose";
import { cEnv } from "../consts/env.const";
import AppConfigDb from "../db/mongo/appConfig.mongo";
import { cBaseAppVersion } from "../enums/appConfig.enum";

// Adds isOtpEnabled to the base configuration of each platform that does not have it yet.
// Versions are left alone: they inherit the base value. Existing values are never overwritten.
async function seedOtpFlag(): Promise<void> {
    if (!cEnv.MONGO_URL) {
        console.error("MONGO_URL not configured");
        process.exit(1);
    }

    await mongoose.connect(cEnv.MONGO_URL);
    const result = await AppConfigDb.updateMany(
        { appVersion: cBaseAppVersion, isOtpEnabled: { $exists: false } },
        { $set: { isOtpEnabled: true } }
    );
    console.log(`Base configurations updated: ${result.modifiedCount} (matched ${result.matchedCount})`);
    await mongoose.disconnect();
}

seedOtpFlag().catch((err) => {
    console.error("Error seeding isOtpEnabled:", err);
    process.exit(1);
});
