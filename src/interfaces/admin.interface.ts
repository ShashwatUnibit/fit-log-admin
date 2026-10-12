import { Schema } from "mongoose";
import { eAdminType } from "../enums/admin.enum";

export interface iAdmins {
    _id?: Schema.Types.ObjectId | string | iAdmins;
    fullName?: string;
    emailId?: string;
    fcmToken?: string;
    password?: string;
    userPassword?: string;
    adminType?: eAdminType;
    isActive?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
