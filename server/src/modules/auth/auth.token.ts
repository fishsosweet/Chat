import crypto from "node:crypto";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  EMAIL_VERIFY_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  RESET_PASSWORD_TOKEN_TTL_SECONDS
} from "../../common/constants/auth";
import { AccessTokenPayload, RefreshTokenPayload } from "./auth.types";

const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

export const createAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  });
};

export const createRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  }) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  }) as RefreshTokenPayload;
};

export const createEmailVerifyToken = (userId: string): { token: string; tokenHash: string; expiresAt: Date } => {
  const token = jwt.sign({ sub: userId, typ: "email_verify" }, env.JWT_EMAIL_VERIFY_SECRET, {
    expiresIn: EMAIL_VERIFY_TOKEN_TTL_SECONDS,
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  });

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: dayjs().add(EMAIL_VERIFY_TOKEN_TTL_SECONDS, "second").toDate()
  };
};

export const verifyEmailToken = (token: string): { sub: string; typ: string } => {
  return jwt.verify(token, env.JWT_EMAIL_VERIFY_SECRET, {
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  }) as { sub: string; typ: string };
};

export const createResetPasswordToken = (userId: string): { token: string; tokenHash: string; expiresAt: Date } => {
  const token = jwt.sign({ sub: userId, typ: "reset_password" }, env.JWT_RESET_PASSWORD_SECRET, {
    expiresIn: RESET_PASSWORD_TOKEN_TTL_SECONDS,
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  });

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: dayjs().add(RESET_PASSWORD_TOKEN_TTL_SECONDS, "second").toDate()
  };
};

export const verifyResetPasswordToken = (token: string): { sub: string; typ: string } => {
  return jwt.verify(token, env.JWT_RESET_PASSWORD_SECRET, {
    issuer: env.APP_NAME,
    audience: "chatrealtime-client"
  }) as { sub: string; typ: string };
};

export const toTokenHash = hashToken;
