import { SessionStatus } from "@prisma/client";
import { Socket } from "socket.io";
import { AppError } from "../../common/errors/app-error";
import { prisma } from "../../config/prisma";
import { verifyAccessToken } from "../../modules/auth/auth.token";
import { SocketAuthContext } from "../types/socket.types";

export const resolveSocketAuth = async (socket: Socket): Promise<SocketAuthContext> => {
  const handshakeToken =
    (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token) ||
    (typeof socket.handshake.headers.authorization === "string" &&
    socket.handshake.headers.authorization.startsWith("Bearer ")
      ? socket.handshake.headers.authorization.substring("Bearer ".length)
      : undefined);

  if (!handshakeToken) {
    throw new AppError("Unauthorized socket", 401);
  }

  const payload = verifyAccessToken(handshakeToken);
  if (payload.typ !== "access") {
    throw new AppError("Invalid access token", 401);
  }

  const session = await prisma.session.findUnique({
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

  if (
    !session ||
    session.userId !== payload.sub ||
    session.status !== SessionStatus.ACTIVE ||
    session.expiresAt < new Date() ||
    session.revokedAt
  ) {
    throw new AppError("Session invalid", 401);
  }

  return {
    userId: session.userId,
    sessionId: session.id,
    deviceId: session.deviceId ?? undefined
  };
};
