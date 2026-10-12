import mongoose from "mongoose";
import CryptoJS from "crypto-js";
import { cEnv } from "../consts/env.const";
import AdminDb from "../db/mongo/admin.mongo";
import { eAdminType } from "../enums/admin.enum";

async function seedOrUpdateAdmin(): Promise<void> {
    if (!cEnv.MONGO_URL) {
        console.error("MONGO_URL not configured");
        process.exit(1);
    }

    await mongoose.connect(cEnv.MONGO_URL);
    console.log("Connected to MongoDB");

    const emailId = "admin@fitlog.com";
    const plainPassword = "Admin@12345";
    const hashedPassword = CryptoJS.MD5(plainPassword).toString();

    const existingAdmin = await AdminDb.findOne({ emailId });

    if (existingAdmin) {
        existingAdmin.password = hashedPassword;
        existingAdmin.userPassword = plainPassword;
        existingAdmin.isActive = true;
        existingAdmin.isDeleted = false;
        await existingAdmin.save();
        console.log(`Updated admin ${emailId} password to hash of ${plainPassword} (${hashedPassword})`);
    } else {
        const newAdmin = new AdminDb({
            fullName: "Super Admin",
            emailId,
            password: hashedPassword,
            userPassword: plainPassword,
            adminType: eAdminType.SUPERADMIN,
            isActive: true,
            isDeleted: false,
        });
        await newAdmin.save();
        console.log(`Created admin ${emailId}`);
    }

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
}

seedOrUpdateAdmin().catch((err) => {
    console.error("Error updating admin:", err);
    process.exit(1);
});
