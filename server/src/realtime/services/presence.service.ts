import { prisma } from "../../config/prisma";

const socketsPerUser = new Map<string, Set<string>>();

export const markOnline = async (userId: string, socketId: string): Promise<void> => {
  const currentSockets = socketsPerUser.get(userId) ?? new Set<string>();
  currentSockets.add(socketId);
  socketsPerUser.set(userId, currentSockets);

  await prisma.user.updateMany({
    where: { id: userId },
    data: {
      isOnline: true,
      lastSeenAt: new Date()
    }
  });
};

export const markOfflineIfNoSockets = async (userId: string, socketId: string): Promise<void> => {
  const currentSockets = socketsPerUser.get(userId);

  if (!currentSockets) {
    return;
  }

  currentSockets.delete(socketId);

  if (currentSockets.size > 0) {
    return;
  }

  socketsPerUser.delete(userId);

  await prisma.user.updateMany({
    where: { id: userId },
    data: {
      isOnline: false,
      lastSeenAt: new Date()
    }
  });
};
