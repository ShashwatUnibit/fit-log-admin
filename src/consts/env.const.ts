import dotenv from "dotenv";
dotenv.config();

const parseIntOrDefault = (value: string | undefined, defaultValue: number): number => {
    if (!value) {
        return defaultValue;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
};

const getEnvMode = (env: string | undefined): string => {
    if (!env) {
        return "dev";
    }
    const lower = env.trim().toLowerCase();
    if (lower === "development" || lower === "dev") {
        return "dev";
    }
    if (lower === "production" || lower === "prod") {
        return "prod";
    }
    return lower;
};

export const cEnv = {
    SERVER_PRIMARY_INSTANCE_NAME: "",
    PORT: parseIntOrDefault(process.env.PORT, 8000),
    SERVER_ENV: getEnvMode(process.env.SERVER_ENV),

    SERVER_S2S_KEY: process.env.SERVER_S2S_KEY ?? "default_s2s_key",
    APP_ID: process.env.APP_ID ?? "default_app_id",
    JWT_SECRET: process.env.JWT_SECRET ?? "default_jwt_secret",
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "default_encryption_key",
    USER_JWT_TOKEN: process.env.USER_JWT_TOKEN ?? "default_user_jwt_secret",
    TWO_FACTOR_API_KEY: process.env.TWO_FACTOR_API_KEY ?? "default_2factor_api_key",

    ENABLE_SSL: process.env.ENABLE_SSL === "true",
    SSL_KEY_PATH: process.env.SSL_KEY_PATH,
    SSL_CERT_PATH: process.env.SSL_CERT_PATH,

    SERVER_COMMON_CODE: process.env.SERVER_COMMON_CODE ?? "app",
    SERVER_CODE: process.env.SERVER_CODE,

    MONGO_URL: process.env.MONGO_URL,

    DB_REDIS_URL: process.env.DB_REDIS_URL,
    DB_REDIS_PARTITIONS: parseIntOrDefault(process.env.DB_REDIS_PARTITIONS, 0),

    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",

    DIGITAL_OCEAN_ACCESS_KEY: process.env.DIGITAL_OCEAN_ACCESS_KEY,
    DIGITAL_OCEAN_SPACES_SECRET: process.env.DIGITAL_OCEAN_SPACES_SECRET,
    DIGITAL_OCEAN_SPACES_BUCKET: process.env.DIGITAL_OCEAN_SPACES_BUCKET,
    DIGITAL_OCEAN_SPACES_ENDPOINT: process.env.DIGITAL_OCEAN_SPACES_ENDPOINT,
    DIGITAL_OCEAN_SPACES_REGION: process.env.DIGITAL_OCEAN_SPACES_REGION,
    DIGITAL_OCEAN_SPACES_BASE_URL: process.env.DIGITAL_OCEAN_SPACES_BASE_URL,

};
