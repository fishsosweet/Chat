"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailController = exports.resetPasswordController = exports.forgotPasswordController = exports.changePasswordController = exports.revokeSessionController = exports.sessionsController = exports.meController = exports.logoutAllController = exports.logoutController = exports.refreshController = exports.loginController = exports.registerController = void 0;
const auth_1 = require("../../common/constants/auth");
const app_error_1 = require("../../common/errors/app-error");
const auth_cookies_1 = require("./auth.cookies");
const auth_service_1 = require("./auth.service");
const registerController = async (req, res) => {
    const result = await (0, auth_service_1.register)(req.body);
    res.status(201).json({
        success: true,
        message: "Register successful. Please verify your email.",
        data: {
            user: (0, auth_service_1.buildAuthResponse)(result.user),
            verifyEmailToken: result.verifyEmailToken
        },
        requestId: req.requestId
    });
};
exports.registerController = registerController;
const loginController = async (req, res) => {
    const result = await (0, auth_service_1.login)({
        ...req.body,
        platform: req.body.platform,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip
    });
    (0, auth_cookies_1.setAuthCookies)(res, result.accessToken, result.refreshToken);
    res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
            user: (0, auth_service_1.buildAuthResponse)(result.user),
            sessionId: result.sessionId,
            deviceId: result.deviceId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        },
        requestId: req.requestId
    });
};
exports.loginController = loginController;
const refreshController = async (req, res) => {
    const token = req.body.refreshToken ?? req.cookies?.[auth_1.REFRESH_TOKEN_COOKIE];
    if (!token) {
        throw new app_error_1.AppError("Refresh token is required", 400);
    }
    const result = await (0, auth_service_1.refreshSession)(token);
    (0, auth_cookies_1.setAuthCookies)(res, result.accessToken, result.refreshToken);
    res.status(200).json({
        success: true,
        message: "Token refreshed",
        data: {
            user: (0, auth_service_1.buildAuthResponse)(result.user),
            sessionId: result.sessionId,
            deviceId: result.deviceId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        },
        requestId: req.requestId
    });
};
exports.refreshController = refreshController;
const logoutController = async (req, res) => {
    const sessionId = req.auth?.sessionId;
    if (!sessionId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    await (0, auth_service_1.logout)(sessionId);
    (0, auth_cookies_1.clearAuthCookies)(res);
    res.status(200).json({
        success: true,
        message: "Logged out",
        requestId: req.requestId
    });
};
exports.logoutController = logoutController;
const logoutAllController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    await (0, auth_service_1.logoutAllDevices)(req.auth.userId, req.auth.sessionId);
    (0, auth_cookies_1.clearAuthCookies)(res);
    res.status(200).json({
        success: true,
        message: "Logged out from all devices",
        requestId: req.requestId
    });
};
exports.logoutAllController = logoutAllController;
const meController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    const user = await (0, auth_service_1.getMe)(req.auth.userId);
    res.status(200).json({
        success: true,
        data: user,
        requestId: req.requestId
    });
};
exports.meController = meController;
const sessionsController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    const sessions = await (0, auth_service_1.listMySessions)(req.auth.userId);
    res.status(200).json({
        success: true,
        data: sessions,
        requestId: req.requestId
    });
};
exports.sessionsController = sessionsController;
const revokeSessionController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    if (!req.body.sessionId) {
        throw new app_error_1.AppError("sessionId is required", 400);
    }
    await (0, auth_service_1.revokeSessionById)(req.auth.userId, req.body.sessionId);
    if (req.body.sessionId === req.auth.sessionId) {
        (0, auth_cookies_1.clearAuthCookies)(res);
    }
    res.status(200).json({
        success: true,
        message: "Session revoked",
        requestId: req.requestId
    });
};
exports.revokeSessionController = revokeSessionController;
const changePasswordController = async (req, res) => {
    if (!req.auth?.userId) {
        throw new app_error_1.AppError("Unauthorized", 401);
    }
    await (0, auth_service_1.changePassword)(req.auth.userId, req.body.currentPassword, req.body.newPassword);
    (0, auth_cookies_1.clearAuthCookies)(res);
    res.status(200).json({
        success: true,
        message: "Password changed. Please login again.",
        requestId: req.requestId
    });
};
exports.changePasswordController = changePasswordController;
const forgotPasswordController = async (req, res) => {
    const result = await (0, auth_service_1.forgotPassword)(req.body.email);
    res.status(200).json({
        success: true,
        message: "If this email exists, a reset request has been accepted.",
        data: result,
        requestId: req.requestId
    });
};
exports.forgotPasswordController = forgotPasswordController;
const resetPasswordController = async (req, res) => {
    await (0, auth_service_1.resetPassword)(req.body.token, req.body.newPassword);
    res.status(200).json({
        success: true,
        message: "Password reset successful",
        requestId: req.requestId
    });
};
exports.resetPasswordController = resetPasswordController;
const verifyEmailController = async (req, res) => {
    await (0, auth_service_1.verifyEmail)(req.body.token);
    res.status(200).json({
        success: true,
        message: "Email verified successfully",
        requestId: req.requestId
    });
};
exports.verifyEmailController = verifyEmailController;
