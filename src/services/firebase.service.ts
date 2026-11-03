import fs from "fs";
import path from "path";
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getMessaging, BatchResponse, Message } from "firebase-admin/messaging";
import { cEnv } from "../consts/env.const";

export default class FirebaseService {
    public static instance: FirebaseService = new FirebaseService();

    private app?: App;

    private constructor() {
        this.initialize();
    }

    private initialize(): void {
        const apps = getApps();
        if (apps.length > 0) {
            [this.app] = apps;
            return;
        }

        try {
            const serviceAccountPath = path.isAbsolute(cEnv.FIREBASE_SERVICE_ACCOUNT_PATH)
                ? cEnv.FIREBASE_SERVICE_ACCOUNT_PATH
                : path.resolve(process.cwd(), cEnv.FIREBASE_SERVICE_ACCOUNT_PATH);

            if (!fs.existsSync(serviceAccountPath)) {
                console.warn(`[FirebaseService] Service account file not found at: ${serviceAccountPath}`);
                return;
            }

            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8")) as Parameters<typeof cert>[0];
            this.app = initializeApp({ credential: cert(serviceAccount) });
            console.log("[FirebaseService] Initialized successfully with service account.");
        } catch (error: unknown) {
            console.error("[FirebaseService] Failed to initialize Firebase Admin:", error);
        }
    }

    // False when the service account is missing or invalid, so nothing can be sent from this server
    public isReady(): boolean {
        return Boolean(this.app ?? getApps().at(0));
    }

    // FCM accepts at most 500 messages per sendEach call; callers are expected to chunk
    public sendEach(messages: Message[]): Promise<BatchResponse> {
        const app = this.app ?? getApps().at(0);
        if (!app) {
            return Promise.reject(new Error("Firebase Admin SDK is not initialized."));
        }
        return getMessaging(app).sendEach(messages);
    }
}
