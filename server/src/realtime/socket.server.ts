import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { resolveSocketAuth } from "./services/socket-auth.service";
import { markOfflineIfNoSockets, markOnline } from "./services/presence.service";
import { registerChatEvents, conversationRoomKey, userRoomKey } from "./events/chat.events";
import { registerCallEvents } from "./events/call.events";

export const createSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
      credentials: true
    },
    pingInterval: 20000,
    pingTimeout: 20000,
    transports: ["websocket", "polling"]
  });

  io.use(async (socket, next) => {
    try {
      const authContext = await resolveSocketAuth(socket);
      socket.data.auth = authContext;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Unauthorized socket"));
    }
  });

  io.on("connection", async (socket) => {
    const auth = socket.data.auth;

    socket.join(userRoomKey(auth.userId));

    socket.on("heartbeat", (payloadOrAck?: unknown, maybeAck?: (data: unknown) => void) => {
      const ack =
        typeof payloadOrAck === "function"
          ? (payloadOrAck as (data: unknown) => void)
          : maybeAck;

      const payload = {
        serverTime: new Date().toISOString(),
        socketId: socket.id
      };

      socket.emit("heartbeat", payload);
      ack?.(payload);
    });

    socket.on("reconnect", () => {
      socket.emit("reconnect", {
        socketId: socket.id,
        reconnectedAt: new Date().toISOString()
      });
    });

    registerChatEvents(io, socket);
    registerCallEvents(io, socket);

    socket.on("disconnect", async (reason) => {
      await markOfflineIfNoSockets(auth.userId, socket.id);
      logger.info({ socketId: socket.id, userId: auth.userId, reason }, "Socket disconnected");
      socket.broadcast.to(userRoomKey(auth.userId)).emit("user_disconnected", {
        userId: auth.userId,
        reason,
        disconnectedAt: new Date().toISOString()
      });
    });

    try {
      const memberships = await prisma.member.findMany({
        where: { userId: auth.userId, status: "ACTIVE" },
        select: { conversationId: true }
      });

      memberships.forEach((member) => {
        socket.join(conversationRoomKey(member.conversationId));
      });
    } catch (error) {
      logger.warn({ err: error, userId: auth.userId }, "Unable to preload conversation rooms");
    }

    await markOnline(auth.userId, socket.id);

    socket.emit("connection", {
      socketId: socket.id,
      userId: auth.userId,
      sessionId: auth.sessionId,
      connectedAt: new Date().toISOString()
    });

    logger.info({ socketId: socket.id, userId: auth.userId }, "Socket connected");
  });

  return io;
};
