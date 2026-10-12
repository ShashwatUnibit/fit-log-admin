import mongoose, { Model, Schema } from "mongoose";
import { iAdmins } from "../../interfaces/admin.interface";
import { cDbNames } from "../../consts/db.const";
import { eAdminType } from "../../enums/admin.enum";

type AdminModel = Model<iAdmins>;

const AdminSchema = new Schema<iAdmins>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        fullName: { type: String, trim: true },
        emailId: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        fcmToken: { type: String, default: "" },
        password: { type: String, required: true },
        userPassword: { type: String },
        adminType: { type: String, enum: Object.values(eAdminType), default: eAdminType.ADMIN },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.admin,
    }
);

const AdminDb: AdminModel = mongoose.model<iAdmins>(cDbNames.admin, AdminSchema, cDbNames.admin);
export default AdminDb;

