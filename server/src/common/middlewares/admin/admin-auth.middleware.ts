import { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/app-error";
import { env } from "../../../config/env";
import { prisma } from "../../../config/prisma";

const parseAdminEmails = (): string[] =>
  env.ADMIN_EMAILS.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export const adminAuthMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const adminEmails = parseAdminEmails();

    if (adminEmails.length === 0) {
      throw new AppError("Admin access not configured", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, blockedAt: true, deletedAt: true }
    });

    if (!user || user.deletedAt || user.blockedAt) {
      throw new AppError("Forbidden", 403);
    }

    if (!adminEmails.includes(user.email.toLowerCase())) {
      throw new AppError("Forbidden", 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
