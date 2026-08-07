"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(8080),
    API_PREFIX: zod_1.z.string().default("/api/v1"),
    APP_NAME: zod_1.z.string().default("ChatRealtime API"),
    LOG_LEVEL: zod_1.z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    CORS_ORIGINS: zod_1.z.string().default("http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    REDIS_ENABLE: zod_1.z.coerce.boolean().default(true),
    ADMIN_EMAILS: zod_1.z.string().default(""),
    RTC_ICE_SERVERS: zod_1.z.string().default("stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"),
    RTC_TURN_USERNAME: zod_1.z.string().default(""),
    RTC_TURN_CREDENTIAL: zod_1.z.string().default(""),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
    JWT_EMAIL_VERIFY_SECRET: zod_1.z.string().min(32, "JWT_EMAIL_VERIFY_SECRET must be at least 32 chars"),
    JWT_RESET_PASSWORD_SECRET: zod_1.z.string().min(32, "JWT_RESET_PASSWORD_SECRET must be at least 32 chars")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}
exports.env = parsed.data;
