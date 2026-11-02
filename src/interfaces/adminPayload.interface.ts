import { eAdminType } from "../enums/admin.enum";

export interface iAddAdminPayload {
    emailId: string;
    password: string;
    fullName: string;
    adminType: eAdminType;
}
