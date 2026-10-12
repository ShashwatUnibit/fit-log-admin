export interface iAdminLoginPayload {
    emailId: string;
    password: string;
    fcmToken?: string;
}

export interface iAdminAutoLoginPayload {
    userId: string;
    password: string;
    fcmToken?: string;
}

export interface iAdminLoginResult {
    admin: Record<string, unknown>;
    token: string;
}