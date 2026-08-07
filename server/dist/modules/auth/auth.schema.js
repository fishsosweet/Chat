"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutSessionSchema = exports.verifyEmailSchema = exports.updateProfileSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const emailSchema = zod_1.z.email().max(320).toLowerCase();
const passwordSchema = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        fullName: zod_1.z.string().trim().min(2).max(120),
        password: passwordSchema,
        phone: zod_1.z.string().trim().min(8).max(32).optional(),
        username: zod_1.z.string().trim().min(3).max(64).optional()
    })
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        password: zod_1.z.string().min(1),
        deviceName: zod_1.z.string().trim().max(120).optional(),
        platform: zod_1.z.enum(["WEB", "IOS", "ANDROID", "DESKTOP"]).default("WEB")
    })
});
exports.refreshSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1).optional()
    })
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema
    })
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1),
        newPassword: passwordSchema
    })
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1),
        newPassword: passwordSchema
    })
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().trim().min(2).max(120).optional(),
        bio: zod_1.z.string().trim().max(500).nullable().optional(),
        avatarUrl: zod_1.z.string().trim().max(2048).nullable().optional(),
        coverUrl: zod_1.z.string().trim().max(2048).nullable().optional()
    })
});
exports.verifyEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1)
    })
});
exports.logoutSessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        sessionId: zod_1.z.string().uuid().optional()
    })
});
