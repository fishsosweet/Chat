import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
import { validateRequest } from "../../common/middlewares/validate-request.middleware";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSessionSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "./auth.schema";
import {
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutAllController,
  logoutController,
  meController,
  refreshController,
  registerController,
  resetPasswordController,
  revokeSessionController,
  sessionsController,
  verifyEmailController
} from "./auth.controller";

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new account
 */
authRouter.post("/auth/register", validateRequest(registerSchema), asyncHandler(registerController));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 */
authRouter.post("/auth/login", validateRequest(loginSchema), asyncHandler(loginController));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
authRouter.post("/auth/refresh", validateRequest(refreshSchema), asyncHandler(refreshController));

authRouter.post("/auth/forgot-password", validateRequest(forgotPasswordSchema), asyncHandler(forgotPasswordController));
authRouter.post("/auth/reset-password", validateRequest(resetPasswordSchema), asyncHandler(resetPasswordController));
authRouter.post("/auth/verify-email", validateRequest(verifyEmailSchema), asyncHandler(verifyEmailController));

authRouter.get("/auth/me", authMiddleware, asyncHandler(meController));
authRouter.get("/auth/sessions", authMiddleware, asyncHandler(sessionsController));

authRouter.post("/auth/logout", authMiddleware, asyncHandler(logoutController));
authRouter.post("/auth/logout-all", authMiddleware, asyncHandler(logoutAllController));
authRouter.post(
  "/auth/revoke-session",
  authMiddleware,
  validateRequest(logoutSessionSchema),
  asyncHandler(revokeSessionController)
);
authRouter.post(
  "/auth/change-password",
  authMiddleware,
  validateRequest(changePasswordSchema),
  asyncHandler(changePasswordController)
);
