import { FriendStatus, Prisma } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { prisma } from "../../config/prisma";

const friendPairWhere = (userAId: string, userBId: string): Prisma.FriendWhereInput => ({
  OR: [
    { requesterId: userAId, addresseeId: userBId },
    { requesterId: userBId, addresseeId: userAId }
  ]
});

export const ensureAcceptedFriendship = async (userAId: string, userBId: string): Promise<void> => {
  const relation = await prisma.friend.findFirst({
    where: {
      ...friendPairWhere(userAId, userBId),
      status: FriendStatus.ACCEPTED
    },
    select: { id: true }
  });

  if (!relation) {
    throw new AppError("You can only chat with accepted friends", 403);
  }
};

export const searchUsers = async (userId: string, keyword: string, limit: number) => {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      blockedAt: null,
      id: { not: userId },
      OR: [
        { fullName: { contains: keyword, mode: "insensitive" } },
        { email: { contains: keyword, mode: "insensitive" } },
        { username: { contains: keyword, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      username: true,
      avatarUrl: true
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  const relations = await prisma.friend.findMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: { in: users.map((user) => user.id) } },
        { requesterId: { in: users.map((user) => user.id) }, addresseeId: userId }
      ]
    },
    select: {
      id: true,
      requesterId: true,
      addresseeId: true,
      status: true
    }
  });

  return users.map((user) => {
    const relation = relations.find(
      (item) =>
        (item.requesterId === userId && item.addresseeId === user.id) ||
        (item.requesterId === user.id && item.addresseeId === userId)
    );

    return {
      ...user,
      friendship:
        relation
          ? {
              friendId: relation.id,
              status: relation.status,
              direction: relation.requesterId === userId ? "outgoing" : "incoming"
            }
          : null
    };
  });
};

export const createFriendRequest = async (userId: string, targetUserId: string) => {
  if (userId === targetUserId) {
    throw new AppError("Cannot send friend request to yourself", 400);
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      deletedAt: null,
      blockedAt: null
    },
    select: { id: true }
  });

  if (!targetUser) {
    throw new AppError("Target user not found", 404);
  }

  const existing = await prisma.friend.findFirst({
    where: friendPairWhere(userId, targetUserId)
  });

  if (!existing) {
    return prisma.friend.create({
      data: {
        requesterId: userId,
        addresseeId: targetUserId,
        status: FriendStatus.PENDING,
        requestedAt: new Date(),
        respondedAt: null,
        blockedById: null
      }
    });
  }

  if (existing.status === FriendStatus.ACCEPTED) {
    throw new AppError("Already friends", 409);
  }

  if (existing.status === FriendStatus.PENDING) {
    if (existing.requesterId === userId) {
      throw new AppError("Friend request already sent", 409);
    }
    throw new AppError("You already have an incoming friend request from this user", 409, {
      friendId: existing.id
    });
  }

  if (existing.status === FriendStatus.BLOCKED && existing.blockedById !== userId) {
    throw new AppError("You cannot send friend request to this user", 403);
  }

  return prisma.friend.update({
    where: { id: existing.id },
    data: {
      requesterId: userId,
      addresseeId: targetUserId,
      status: FriendStatus.PENDING,
      requestedAt: new Date(),
      respondedAt: null,
      blockedById: null
    }
  });
};

export const listIncomingRequests = async (userId: string) => {
  return prisma.friend.findMany({
    where: {
      addresseeId: userId,
      status: FriendStatus.PENDING
    },
    orderBy: { requestedAt: "desc" },
    include: {
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });
};

export const listOutgoingRequests = async (userId: string) => {
  return prisma.friend.findMany({
    where: {
      requesterId: userId,
      status: FriendStatus.PENDING
    },
    orderBy: { requestedAt: "desc" },
    include: {
      addressee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });
};

export const acceptFriendRequest = async (userId: string, friendId: string) => {
  const request = await prisma.friend.findUnique({
    where: { id: friendId },
    select: {
      id: true,
      addresseeId: true,
      status: true
    }
  });

  if (!request) {
    throw new AppError("Friend request not found", 404);
  }

  if (request.addresseeId !== userId) {
    throw new AppError("Forbidden", 403);
  }

  if (request.status !== FriendStatus.PENDING) {
    throw new AppError("Friend request is not pending", 409);
  }

  return prisma.friend.update({
    where: { id: friendId },
    data: {
      status: FriendStatus.ACCEPTED,
      respondedAt: new Date(),
      blockedById: null
    }
  });
};

export const rejectFriendRequest = async (userId: string, friendId: string) => {
  const request = await prisma.friend.findUnique({
    where: { id: friendId },
    select: {
      id: true,
      addresseeId: true,
      status: true
    }
  });

  if (!request) {
    throw new AppError("Friend request not found", 404);
  }

  if (request.addresseeId !== userId) {
    throw new AppError("Forbidden", 403);
  }

  if (request.status !== FriendStatus.PENDING) {
    throw new AppError("Friend request is not pending", 409);
  }

  return prisma.friend.update({
    where: { id: friendId },
    data: {
      status: FriendStatus.REJECTED,
      respondedAt: new Date()
    }
  });
};

export const cancelOutgoingFriendRequest = async (userId: string, friendId: string) => {
  const request = await prisma.friend.findUnique({
    where: { id: friendId },
    select: {
      id: true,
      requesterId: true,
      addresseeId: true,
      status: true
    }
  });

  if (!request) {
    throw new AppError("Friend request not found", 404);
  }

  if (request.requesterId !== userId) {
    throw new AppError("Forbidden", 403);
  }

  if (request.status !== FriendStatus.PENDING) {
    throw new AppError("Friend request is not pending", 409);
  }

  await prisma.friend.delete({ where: { id: friendId } });

  return {
    success: true,
    requesterId: request.requesterId,
    addresseeId: request.addresseeId
  };
};

export const listFriends = async (userId: string) => {
  const items = await prisma.friend.findMany({
    where: {
      status: FriendStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { addresseeId: userId }]
    },
    orderBy: { updatedAt: "desc" },
    include: {
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true
        }
      },
      addressee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });

  return items.map((item) => {
    const friendUser = item.requesterId === userId ? item.addressee : item.requester;
    return {
      friendId: item.id,
      user: friendUser,
      acceptedAt: item.respondedAt?.toISOString() ?? item.updatedAt.toISOString()
    };
  });
};

export const unfriend = async (userId: string, otherUserId: string) => {
  if (userId === otherUserId) {
    throw new AppError("Invalid unfriend target", 400);
  }

  const relation = await prisma.friend.findFirst({
    where: {
      ...friendPairWhere(userId, otherUserId),
      status: FriendStatus.ACCEPTED
    },
    select: { id: true }
  });

  if (!relation) {
    throw new AppError("Friend relationship not found", 404);
  }

  await prisma.friend.delete({ where: { id: relation.id } });

  return {
    success: true,
    requesterId: userId,
    addresseeId: otherUserId
  };
};
