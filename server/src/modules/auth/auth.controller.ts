import { Request, Response } from "express";
import { DevicePlatform } from "@prisma/client";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "../../common/constants/auth";
import { AppError } from "../../common/errors/app-error";
import { clearAuthCookies, setAuthCookies } from "./auth.cookies";
import {
  buildAuthResponse,
  changePassword,
  forgotPassword,
  getMe,
  listMySessions,
  login,
  logout,
  logoutAllDevices,
  refreshSession,
  register,
  resetPassword,
  revokeSessionById,
  verifyEmail
} from "./auth.service";

export const registerController = async (req: Request, res: Response): Promise<void> => {
  const result = await register(req.body);

  res.status(201).json({
    success: true,
    message: "Register successful. Please verify your email.",
    data: {
      user: buildAuthResponse(result.user),
      verifyEmailToken: result.verifyEmailToken
    },
    requestId: req.requestId
  });
};

export const loginController = async (req: Request, res: Response): Promise<void> => {
  const result = await login({
    ...req.body,
    platform: req.body.platform as DevicePlatform,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip
  });

  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: buildAuthResponse(result.user),
      sessionId: result.sessionId,
      deviceId: result.deviceId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    requestId: req.requestId
  });
};

export const refreshController = async (req: Request, res: Response): Promise<void> => {
  const token = req.body.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];

  if (!token) {
    throw new AppError("Refresh token is required", 400);
  }

  const result = await refreshSession(token);
  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: {
      user: buildAuthResponse(result.user),
      sessionId: result.sessionId,
      deviceId: result.deviceId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    requestId: req.requestId
  });
};

export const logoutController = async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.auth?.sessionId;

  if (!sessionId) {
    throw new AppError("Unauthorized", 401);
  }

  await logout(sessionId);
  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Logged out",
    requestId: req.requestId
  });
};

export const logoutAllController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  await logoutAllDevices(req.auth.userId, req.auth.sessionId);
  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Logged out from all devices",
    requestId: req.requestId
  });
};

export const meController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const user = await getMe(req.auth.userId);

  res.status(200).json({
    success: true,
    data: user,
    requestId: req.requestId
  });
};

export const sessionsController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  const sessions = await listMySessions(req.auth.userId);

  res.status(200).json({
    success: true,
    data: sessions,
    requestId: req.requestId
  });
};

export const revokeSessionController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!req.body.sessionId) {
    throw new AppError("sessionId is required", 400);
  }

  await revokeSessionById(req.auth.userId, req.body.sessionId);

  if (req.body.sessionId === req.auth.sessionId) {
    clearAuthCookies(res);
  }

  res.status(200).json({
    success: true,
    message: "Session revoked",
    requestId: req.requestId
  });
};

export const changePasswordController = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  await changePassword(req.auth.userId, req.body.currentPassword, req.body.newPassword);
  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Password changed. Please login again.",
    requestId: req.requestId
  });
};

export const forgotPasswordController = async (req: Request, res: Response): Promise<void> => {
  const result = await forgotPassword(req.body.email);

  res.status(200).json({
    success: true,
    message: "If this email exists, a reset request has been accepted.",
    data: result,
    requestId: req.requestId
  });
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
  await resetPassword(req.body.token, req.body.newPassword);

  res.status(200).json({
    success: true,
    message: "Password reset successful",
    requestId: req.requestId
  });
};

export const verifyEmailController = async (req: Request, res: Response): Promise<void> => {
  await verifyEmail(req.body.token);

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
    requestId: req.requestId
  });
};
