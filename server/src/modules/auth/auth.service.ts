import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { DevicePlatform, LoginAction, SessionStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { prisma } from "../../config/prisma";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS
} from "../../common/constants/auth";
import {
  createAccessToken,
  createEmailVerifyToken,
  createRefreshToken,
  createResetPasswordToken,
  toTokenHash,
  verifyEmailToken,
  verifyRefreshToken,
  verifyResetPasswordToken
} from "./auth.token";

interface DeviceInfoInput {
  platform: DevicePlatform;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  username?: string;
}

interface LoginInput {
  email: string;
  password: string;
  deviceName?: string;
  platform: DevicePlatform;
  userAgent?: string;
  ipAddress?: string;
}

const createSessionTokens = async (userId: string, deviceInfo: DeviceInfoInput) => {
  const device = await prisma.device.create({
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

  const session = await prisma.session.create({
    data: {
      userId,
      deviceId: device.id,
      status: SessionStatus.ACTIVE,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt: dayjs().add(REFRESH_TOKEN_TTL_SECONDS, "second").toDate(),
      refreshTokenHash: "pending"
    }
  });

  const accessToken = createAccessToken({ sub: userId, sid: session.id, did: device.id, typ: "access" });
  const refreshToken = createRefreshToken({ sub: userId, sid: session.id, did: device.id, typ: "refresh" });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: toTokenHash(refreshToken)
    }
  });

  return { sessionId: session.id, deviceId: device.id, accessToken, refreshToken };
};

export const register = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      username: input.username,
      isOnline: false
    }
  });

  const { token, tokenHash, expiresAt } = createEmailVerifyToken(user.id);

  await prisma.auditLog.create({
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

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || user.deletedAt || user.blockedAt) {
    throw new AppError("Invalid credentials", 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      action: LoginAction.LOGIN,
      success: isPasswordValid,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401);
  }

  const tokens = await createSessionTokens(user.id, {
    platform: input.platform,
    deviceName: input.deviceName,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  await prisma.user.update({
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

export const refreshSession = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);

  if (payload.typ !== "refresh") {
    throw new AppError("Invalid refresh token", 401);
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true }
  });

  if (!session || session.status !== SessionStatus.ACTIVE || session.expiresAt < new Date()) {
    throw new AppError("Session expired or revoked", 401);
  }

  const tokenHash = toTokenHash(refreshToken);
  if (session.refreshTokenHash !== tokenHash) {
    throw new AppError("Invalid refresh token", 401);
  }

  const newAccessToken = createAccessToken({
    sub: session.userId,
    sid: session.id,
    did: session.deviceId ?? undefined,
    typ: "access"
  });

  const newRefreshToken = createRefreshToken({
    sub: session.userId,
    sid: session.id,
    did: session.deviceId ?? undefined,
    typ: "refresh"
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: toTokenHash(newRefreshToken),
      expiresAt: dayjs().add(REFRESH_TOKEN_TTL_SECONDS, "second").toDate()
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

export const logout = async (sessionId: string) => {
  await prisma.session.updateMany({
    where: { id: sessionId },
    data: {
      status: SessionStatus.REVOKED,
      revokedAt: new Date()
    }
  });
};

export const logoutAllDevices = async (userId: string, exceptSessionId?: string) => {
  await prisma.session.updateMany({
    where: {
      userId,
      status: SessionStatus.ACTIVE,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {})
    },
    data: {
      status: SessionStatus.REVOKED,
      revokedAt: new Date()
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: false,
      lastSeenAt: new Date()
    }
  });
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
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
    throw new AppError("User not found", 404);
  }

  return user;
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
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
    throw new AppError("User not found", 404);
  }

  return user;
};

export const updateProfile = async (userId: string, input: { fullName?: string; bio?: string | null; avatarUrl?: string | null; coverUrl?: string | null }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const nextData: Record<string, unknown> = {};

  if (input.fullName !== undefined) {
    nextData.fullName = input.fullName.trim();
  }
  if (input.bio !== undefined) {
    nextData.bio = input.bio?.trim() ? input.bio.trim() : null;
  }
  if (input.avatarUrl !== undefined) {
    nextData.avatarUrl = input.avatarUrl?.trim() ? input.avatarUrl.trim() : null;
  }
  if (input.coverUrl !== undefined) {
    nextData.coverUrl = input.coverUrl?.trim() ? input.coverUrl.trim() : null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: nextData,
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

  return updated;
};

export const listMySessions = async (userId: string) => {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      device: true
    }
  });
};

export const revokeSessionById = async (userId: string, sessionId: string) => {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });

  if (!session) {
    throw new AppError("Session not found", 404);
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.REVOKED,
      revokedAt: new Date()
    }
  });
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash }
  });

  await logoutAllDevices(userId);
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { accepted: true };
  }

  const { token, tokenHash, expiresAt } = createResetPasswordToken(user.id);

  await prisma.auditLog.create({
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

export const resetPassword = async (token: string, newPassword: string) => {
  const payload = verifyResetPasswordToken(token);
  if (payload.typ !== "reset_password") {
    throw new AppError("Invalid reset token", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AppError("Invalid reset token", 400);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });

  await logoutAllDevices(user.id);
};

export const verifyEmail = async (token: string) => {
  const payload = verifyEmailToken(token);
  if (payload.typ !== "email_verify") {
    throw new AppError("Invalid verify token", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AppError("Invalid verify token", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date()
    }
  });
};

export const buildAuthResponse = (user: {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  emailVerifiedAt: Date | null;
}) => ({
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
