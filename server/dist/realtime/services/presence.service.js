"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markOfflineIfNoSockets = exports.markOnline = void 0;
const prisma_1 = require("../../config/prisma");
const socketsPerUser = new Map();
const markOnline = async (userId, socketId) => {
    const currentSockets = socketsPerUser.get(userId) ?? new Set();
    currentSockets.add(socketId);
    socketsPerUser.set(userId, currentSockets);
    await prisma_1.prisma.user.updateMany({
        where: { id: userId },
        data: {
            isOnline: true,
            lastSeenAt: new Date()
        }
    });
};
exports.markOnline = markOnline;
const markOfflineIfNoSockets = async (userId, socketId) => {
    const currentSockets = socketsPerUser.get(userId);
    if (!currentSockets) {
        return;
    }
    currentSockets.delete(socketId);
    if (currentSockets.size > 0) {
        return;
    }
    socketsPerUser.delete(userId);
    await prisma_1.prisma.user.updateMany({
        where: { id: userId },
        data: {
            isOnline: false,
            lastSeenAt: new Date()
        }
    });
};
exports.markOfflineIfNoSockets = markOfflineIfNoSockets;
