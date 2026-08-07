"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../common/utils/async-handler");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const validate_request_middleware_1 = require("../../common/middlewares/validate-request.middleware");
const auth_schema_1 = require("./auth.schema");
const auth_controller_1 = require("./auth.controller");
exports.authRouter = (0, express_1.Router)();
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new account
 */
exports.authRouter.post("/auth/register", (0, validate_request_middleware_1.validateRequest)(auth_schema_1.registerSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.registerController));
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 */
exports.authRouter.post("/auth/login", (0, validate_request_middleware_1.validateRequest)(auth_schema_1.loginSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.loginController));
/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
exports.authRouter.post("/auth/refresh", (0, validate_request_middleware_1.validateRequest)(auth_schema_1.refreshSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.refreshController));
exports.authRouter.post("/auth/forgot-password", (0, validate_request_middleware_1.validateRequest)(auth_schema_1.forgotPasswordSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.forgotPasswordController));
exports.authRouter.post("/auth/reset-password", (0, validate_request_middleware_1.validateRequest)(auth_schema_1.resetPasswordSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.resetPasswordController));
exports.authRouter.post("/auth/verify-email", (0, validate_request_middleware_1.validateRequest)(auth_schema_1.verifyEmailSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.verifyEmailController));
exports.authRouter.get("/auth/me", auth_middleware_1.authMiddleware, (0, async_handler_1.asyncHandler)(auth_controller_1.meController));
exports.authRouter.get("/auth/sessions", auth_middleware_1.authMiddleware, (0, async_handler_1.asyncHandler)(auth_controller_1.sessionsController));
exports.authRouter.post("/auth/logout", auth_middleware_1.authMiddleware, (0, async_handler_1.asyncHandler)(auth_controller_1.logoutController));
exports.authRouter.post("/auth/logout-all", auth_middleware_1.authMiddleware, (0, async_handler_1.asyncHandler)(auth_controller_1.logoutAllController));
exports.authRouter.post("/auth/revoke-session", auth_middleware_1.authMiddleware, (0, validate_request_middleware_1.validateRequest)(auth_schema_1.logoutSessionSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.revokeSessionController));
exports.authRouter.post("/auth/change-password", auth_middleware_1.authMiddleware, (0, validate_request_middleware_1.validateRequest)(auth_schema_1.changePasswordSchema), (0, async_handler_1.asyncHandler)(auth_controller_1.changePasswordController));
