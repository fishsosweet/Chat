"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocketServer = void 0;
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const prisma_1 = require("../config/prisma");
const socket_auth_service_1 = require("./services/socket-auth.service");
const presence_service_1 = require("./services/presence.service");
const chat_events_1 = require("./events/chat.events");
const call_events_1 = require("./events/call.events");
const createSocketServer = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        path: "/socket.io",
        cors: {
            origin: env_1.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
            credentials: true
        },
        pingInterval: 20000,
        pingTimeout: 20000,
        transports: ["websocket", "polling"]
    });
    io.use(async (socket, next) => {
        try {
            const authContext = await (0, socket_auth_service_1.resolveSocketAuth)(socket);
            socket.data.auth = authContext;
            next();
        }
        catch (error) {
            next(error instanceof Error ? error : new Error("Unauthorized socket"));
        }
    });
    io.on("connection", async (socket) => {
        const auth = socket.data.auth;
        socket.join((0, chat_events_1.userRoomKey)(auth.userId));
        socket.on("heartbeat", (payloadOrAck, maybeAck) => {
            const ack = typeof payloadOrAck === "function"
                ? payloadOrAck
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
        (0, chat_events_1.registerChatEvents)(io, socket);
        (0, call_events_1.registerCallEvents)(io, socket);
        socket.on("disconnect", async (reason) => {
            await (0, presence_service_1.markOfflineIfNoSockets)(auth.userId, socket.id);
            logger_1.logger.info({ socketId: socket.id, userId: auth.userId, reason }, "Socket disconnected");
            socket.broadcast.to((0, chat_events_1.userRoomKey)(auth.userId)).emit("user_disconnected", {
                userId: auth.userId,
                reason,
                disconnectedAt: new Date().toISOString()
            });
        });
        try {
            const memberships = await prisma_1.prisma.member.findMany({
                where: { userId: auth.userId, status: "ACTIVE" },
                select: { conversationId: true }
            });
            memberships.forEach((member) => {
                socket.join((0, chat_events_1.conversationRoomKey)(member.conversationId));
            });
        }
        catch (error) {
            logger_1.logger.warn({ err: error, userId: auth.userId }, "Unable to preload conversation rooms");
        }
        await (0, presence_service_1.markOnline)(auth.userId, socket.id);
        socket.emit("connection", {
            socketId: socket.id,
            userId: auth.userId,
            sessionId: auth.sessionId,
            connectedAt: new Date().toISOString()
        });
        logger_1.logger.info({ socketId: socket.id, userId: auth.userId }, "Socket connected");
    });
    return io;
};
exports.createSocketServer = createSocketServer;
