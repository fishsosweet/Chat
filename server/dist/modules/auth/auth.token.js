"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTokenHash = exports.verifyResetPasswordToken = exports.createResetPasswordToken = exports.verifyEmailToken = exports.createEmailVerifyToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.createRefreshToken = exports.createAccessToken = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const dayjs_1 = __importDefault(require("dayjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const auth_1 = require("../../common/constants/auth");
const hashToken = (token) => node_crypto_1.default.createHash("sha256").update(token).digest("hex");
const createAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: auth_1.ACCESS_TOKEN_TTL_SECONDS,
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
};
exports.createAccessToken = createAccessToken;
const createRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: auth_1.REFRESH_TOKEN_TTL_SECONDS,
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
};
exports.createRefreshToken = createRefreshToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET, {
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET, {
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
};
exports.verifyRefreshToken = verifyRefreshToken;
const createEmailVerifyToken = (userId) => {
    const token = jsonwebtoken_1.default.sign({ sub: userId, typ: "email_verify" }, env_1.env.JWT_EMAIL_VERIFY_SECRET, {
        expiresIn: auth_1.EMAIL_VERIFY_TOKEN_TTL_SECONDS,
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
    return {
        token,
        tokenHash: hashToken(token),
        expiresAt: (0, dayjs_1.default)().add(auth_1.EMAIL_VERIFY_TOKEN_TTL_SECONDS, "second").toDate()
    };
};
exports.createEmailVerifyToken = createEmailVerifyToken;
const verifyEmailToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_EMAIL_VERIFY_SECRET, {
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
};
exports.verifyEmailToken = verifyEmailToken;
const createResetPasswordToken = (userId) => {
    const token = jsonwebtoken_1.default.sign({ sub: userId, typ: "reset_password" }, env_1.env.JWT_RESET_PASSWORD_SECRET, {
        expiresIn: auth_1.RESET_PASSWORD_TOKEN_TTL_SECONDS,
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
    return {
        token,
        tokenHash: hashToken(token),
        expiresAt: (0, dayjs_1.default)().add(auth_1.RESET_PASSWORD_TOKEN_TTL_SECONDS, "second").toDate()
    };
};
exports.createResetPasswordToken = createResetPasswordToken;
const verifyResetPasswordToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_RESET_PASSWORD_SECRET, {
        issuer: env_1.env.APP_NAME,
        audience: "chatrealtime-client"
    });
};
exports.verifyResetPasswordToken = verifyResetPasswordToken;
exports.toTokenHash = hashToken;
