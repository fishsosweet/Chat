"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSocketAuth = void 0;
const client_1 = require("@prisma/client");
const app_error_1 = require("../../common/errors/app-error");
const prisma_1 = require("../../config/prisma");
const auth_token_1 = require("../../modules/auth/auth.token");
const resolveSocketAuth = async (socket) => {
    const handshakeToken = (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token) ||
        (typeof socket.handshake.headers.authorization === "string" &&
            socket.handshake.headers.authorization.startsWith("Bearer ")
            ? socket.handshake.headers.authorization.substring("Bearer ".length)
            : undefined);
    if (!handshakeToken) {
        throw new app_error_1.AppError("Unauthorized socket", 401);
    }
    const payload = (0, auth_token_1.verifyAccessToken)(handshakeToken);
    if (payload.typ !== "access") {
        throw new app_error_1.AppError("Invalid access token", 401);
    }
    const session = await prisma_1.prisma.session.findUnique({
        where: { id: payload.sid },
        select: {
            id: true,
            userId: true,
            deviceId: true,
            status: true,
            expiresAt: true,
            revokedAt: true
        }
    });
    if (!session ||
        session.userId !== payload.sub ||
        session.status !== client_1.SessionStatus.ACTIVE ||
        session.expiresAt < new Date() ||
        session.revokedAt) {
        throw new app_error_1.AppError("Session invalid", 401);
    }
    return {
        userId: session.userId,
        sessionId: session.id,
        deviceId: session.deviceId ?? undefined
    };
};
exports.resolveSocketAuth = resolveSocketAuth;
