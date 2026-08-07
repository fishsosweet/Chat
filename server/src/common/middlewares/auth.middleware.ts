import { NextFunction, Request, Response } from "express";
import { SessionStatus } from "@prisma/client";
import { ACCESS_TOKEN_COOKIE } from "../constants/auth";
import { AppError } from "../errors/app-error";
import { verifyAccessToken } from "../../modules/auth/auth.token";
import { prisma } from "../../config/prisma";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      userId: string;
      sessionId: string;
      deviceId?: string;
    };
  }
}

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.substring("Bearer ".length)
      : undefined;

    const accessToken = bearerToken ?? req.cookies?.[ACCESS_TOKEN_COOKIE];

    if (!accessToken) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = verifyAccessToken(accessToken);

    if (payload.typ !== "access") {
      throw new AppError("Invalid token", 401);
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      select: {
        id: true,
        userId: true,
        status: true,
        expiresAt: true,
        revokedAt: true
      }
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.status !== SessionStatus.ACTIVE ||
      session.expiresAt < new Date() ||
      session.revokedAt
    ) {
      throw new AppError("Session is invalid", 401);
    }

    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      deviceId: payload.did
    };

    next();
  } catch {
    next(new AppError("Unauthorized", 401));
  }
};
