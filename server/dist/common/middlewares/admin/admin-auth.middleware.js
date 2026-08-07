"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthMiddleware = void 0;
const app_error_1 = require("../../errors/app-error");
const env_1 = require("../../../config/env");
const prisma_1 = require("../../../config/prisma");
const parseAdminEmails = () => env_1.env.ADMIN_EMAILS.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
const adminAuthMiddleware = async (req, _res, next) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new app_error_1.AppError("Unauthorized", 401);
        }
        const adminEmails = parseAdminEmails();
        if (adminEmails.length === 0) {
            throw new app_error_1.AppError("Admin access not configured", 403);
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, blockedAt: true, deletedAt: true }
        });
        if (!user || user.deletedAt || user.blockedAt) {
            throw new app_error_1.AppError("Forbidden", 403);
        }
        if (!adminEmails.includes(user.email.toLowerCase())) {
            throw new app_error_1.AppError("Forbidden", 403);
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.adminAuthMiddleware = adminAuthMiddleware;
