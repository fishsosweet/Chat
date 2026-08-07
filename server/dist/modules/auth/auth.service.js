"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuthResponse = exports.verifyEmail = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.revokeSessionById = exports.listMySessions = exports.getMe = exports.logoutAllDevices = exports.logout = exports.refreshSession = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dayjs_1 = __importDefault(require("dayjs"));
const client_1 = require("@prisma/client");
const app_error_1 = require("../../common/errors/app-error");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../common/constants/auth");
const auth_token_1 = require("./auth.token");
const createSessionTokens = async (userId, deviceInfo) => {
    const device = await prisma_1.prisma.device.create({
        data: {
            userId,
            platform: deviceInfo.platform,
            deviceName: deviceInfo.deviceName,
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            lastActiveAt: new Date(),
            lastLoginAt: new Date()
        }
    });
    const session = await prisma_1.prisma.session.create({
        data: {
            userId,
            deviceId: device.id,
            status: client_1.SessionStatus.ACTIVE,
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            expiresAt: (0, dayjs_1.default)().add(auth_1.REFRESH_TOKEN_TTL_SECONDS, "second").toDate(),
            refreshTokenHash: "pending"
        }
    });
    const accessToken = (0, auth_token_1.createAccessToken)({ sub: userId, sid: session.id, did: device.id, typ: "access" });
    const refreshToken = (0, auth_token_1.createRefreshToken)({ sub: userId, sid: session.id, did: device.id, typ: "refresh" });
    await prisma_1.prisma.session.update({
        where: { id: session.id },
        data: {
            refreshTokenHash: (0, auth_token_1.toTokenHash)(refreshToken)
        }
    });
    return { sessionId: session.id, deviceId: device.id, accessToken, refreshToken };
};
const register = async (input) => {
    const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
        throw new app_error_1.AppError("Email already in use", 409);
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    const user = await prisma_1.prisma.user.create({
        data: {
            email: input.email,
            passwordHash,
            fullName: input.fullName,
            phone: input.phone,
            username: input.username,
            isOnline: false
        }
    });
    const { token, tokenHash, expiresAt } = (0, auth_token_1.createEmailVerifyToken)(user.id);
    await prisma_1.prisma.auditLog.create({
        data: {
            actorUserId: user.id,
            action: "auth.register",
            resourceType: "User",
            resourceId: user.id,
            metadata: {
                emailVerifyTokenHash: tokenHash,
                emailVerifyExpiresAt: expiresAt.toISOString()
            }
        }
    });
    return {
        user,
        verifyEmailToken: token
    };
};
exports.register = register;
const login = async (input) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.deletedAt || user.blockedAt) {
        throw new app_error_1.AppError("Invalid credentials", 401);
    }
    const isPasswordValid = await bcryptjs_1.default.compare(input.password, user.passwordHash);
    await prisma_1.prisma.loginHistory.create({
        data: {
            userId: user.id,
            action: client_1.LoginAction.LOGIN,
            success: isPasswordValid,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent
        }
    });
    if (!isPasswordValid) {
        throw new app_error_1.AppError("Invalid credentials", 401);
    }
    const tokens = await createSessionTokens(user.id, {
        platform: input.platform,
        deviceName: input.deviceName,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
    });
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            isOnline: true,
            lastSeenAt: new Date()
        }
    });
    return {
        user,
        ...tokens
    };
};
exports.login = login;
const refreshSession = async (refreshToken) => {
    const payload = (0, auth_token_1.verifyRefreshToken)(refreshToken);
    if (payload.typ !== "refresh") {
        throw new app_error_1.AppError("Invalid refresh token", 401);
    }
    const session = await prisma_1.prisma.session.findUnique({
        where: { id: payload.sid },
        include: { user: true }
    });
    if (!session || session.status !== client_1.SessionStatus.ACTIVE || session.expiresAt < new Date()) {
        throw new app_error_1.AppError("Session expired or revoked", 401);
    }
    const tokenHash = (0, auth_token_1.toTokenHash)(refreshToken);
    if (session.refreshTokenHash !== tokenHash) {
        throw new app_error_1.AppError("Invalid refresh token", 401);
    }
    const newAccessToken = (0, auth_token_1.createAccessToken)({
        sub: session.userId,
        sid: session.id,
        did: session.deviceId ?? undefined,
        typ: "access"
    });
    const newRefreshToken = (0, auth_token_1.createRefreshToken)({
        sub: session.userId,
        sid: session.id,
        did: session.deviceId ?? undefined,
        typ: "refresh"
    });
    await prisma_1.prisma.session.update({
        where: { id: session.id },
        data: {
            refreshTokenHash: (0, auth_token_1.toTokenHash)(newRefreshToken),
            expiresAt: (0, dayjs_1.default)().add(auth_1.REFRESH_TOKEN_TTL_SECONDS, "second").toDate()
        }
    });
    return {
        user: session.user,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionId: session.id,
        deviceId: session.deviceId ?? undefined
    };
};
exports.refreshSession = refreshSession;
const logout = async (sessionId) => {
    await prisma_1.prisma.session.updateMany({
        where: { id: sessionId },
        data: {
            status: client_1.SessionStatus.REVOKED,
            revokedAt: new Date()
        }
    });
};
exports.logout = logout;
const logoutAllDevices = async (userId, exceptSessionId) => {
    await prisma_1.prisma.session.updateMany({
        where: {
            userId,
            status: client_1.SessionStatus.ACTIVE,
            ...(exceptSessionId ? { id: { not: exceptSessionId } } : {})
        },
        data: {
            status: client_1.SessionStatus.REVOKED,
            revokedAt: new Date()
        }
    });
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            isOnline: false,
            lastSeenAt: new Date()
        }
    });
};
exports.logoutAllDevices = logoutAllDevices;
const getMe = async (userId) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            fullName: true,
            username: true,
            phone: true,
            avatarUrl: true,
            coverUrl: true,
            bio: true,
            emailVerifiedAt: true,
            isOnline: true,
            lastSeenAt: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        throw new app_error_1.AppError("User not found", 404);
    }
    return user;
};
exports.getMe = getMe;
const listMySessions = async (userId) => {
    return prisma_1.prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            device: true
        }
    });
};
exports.listMySessions = listMySessions;
const revokeSessionById = async (userId, sessionId) => {
    const session = await prisma_1.prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) {
        throw new app_error_1.AppError("Session not found", 404);
    }
    await prisma_1.prisma.session.update({
        where: { id: sessionId },
        data: {
            status: client_1.SessionStatus.REVOKED,
            revokedAt: new Date()
        }
    });
};
exports.revokeSessionById = revokeSessionById;
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new app_error_1.AppError("User not found", 404);
    }
    const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
        throw new app_error_1.AppError("Current password is incorrect", 401);
    }
    const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
    });
    await (0, exports.logoutAllDevices)(userId);
};
exports.changePassword = changePassword;
const forgotPassword = async (email) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        return { accepted: true };
    }
    const { token, tokenHash, expiresAt } = (0, auth_token_1.createResetPasswordToken)(user.id);
    await prisma_1.prisma.auditLog.create({
        data: {
            actorUserId: user.id,
            action: "auth.forgot_password",
            resourceType: "User",
            resourceId: user.id,
            metadata: {
                resetPasswordTokenHash: tokenHash,
                resetPasswordExpiresAt: expiresAt.toISOString()
            }
        }
    });
    return {
        accepted: true,
        resetPasswordToken: token
    };
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (token, newPassword) => {
    const payload = (0, auth_token_1.verifyResetPasswordToken)(token);
    if (payload.typ !== "reset_password") {
        throw new app_error_1.AppError("Invalid reset token", 400);
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
        throw new app_error_1.AppError("Invalid reset token", 400);
    }
    const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });
    await (0, exports.logoutAllDevices)(user.id);
};
exports.resetPassword = resetPassword;
const verifyEmail = async (token) => {
    const payload = (0, auth_token_1.verifyEmailToken)(token);
    if (payload.typ !== "email_verify") {
        throw new app_error_1.AppError("Invalid verify token", 400);
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
        throw new app_error_1.AppError("Invalid verify token", 400);
    }
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerifiedAt: new Date()
        }
    });
};
exports.verifyEmail = verifyEmail;
const buildAuthResponse = (user) => ({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    username: user.username,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    bio: user.bio,
    emailVerified: Boolean(user.emailVerifiedAt)
});
exports.buildAuthResponse = buildAuthResponse;
