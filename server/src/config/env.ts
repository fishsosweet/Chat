import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  API_PREFIX: z.string().default("/api/v1"),
  APP_NAME: z.string().default("ChatRealtime API"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_ENABLE: z.coerce.boolean().default(true),
  ADMIN_EMAILS: z.string().default(""),
  RTC_ICE_SERVERS: z.string().default("stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"),
  RTC_TURN_USERNAME: z.string().default(""),
  RTC_TURN_CREDENTIAL: z.string().default(""),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_EMAIL_VERIFY_SECRET: z.string().min(32, "JWT_EMAIL_VERIFY_SECRET must be at least 32 chars"),
  JWT_RESET_PASSWORD_SECRET: z.string().min(32, "JWT_RESET_PASSWORD_SECRET must be at least 32 chars")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
