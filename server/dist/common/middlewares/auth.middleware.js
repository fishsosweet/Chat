"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const client_1 = require("@prisma/client");
const auth_1 = require("../constants/auth");
const app_error_1 = require("../errors/app-error");
const auth_token_1 = require("../../modules/auth/auth.token");
const prisma_1 = require("../../config/prisma");
const authMiddleware = async (req, _res, next) => {
    try {
        const bearerToken = req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.substring("Bearer ".length)
            : undefined;
        const accessToken = bearerToken ?? req.cookies?.[auth_1.ACCESS_TOKEN_COOKIE];
        if (!accessToken) {
            throw new app_error_1.AppError("Unauthorized", 401);
        }
        const payload = (0, auth_token_1.verifyAccessToken)(accessToken);
        if (payload.typ !== "access") {
            throw new app_error_1.AppError("Invalid token", 401);
        }
        const session = await prisma_1.prisma.session.findUnique({
            where: { id: payload.sid },
            select: {
                id: true,
                userId: true,
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
            throw new app_error_1.AppError("Session is invalid", 401);
        }
        req.auth = {
            userId: payload.sub,
            sessionId: payload.sid,
            deviceId: payload.did
        };
        next();
    }
    catch {
        next(new app_error_1.AppError("Unauthorized", 401));
    }
};
exports.authMiddleware = authMiddleware;
