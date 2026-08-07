"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unfriend = exports.listFriends = exports.cancelOutgoingFriendRequest = exports.rejectFriendRequest = exports.acceptFriendRequest = exports.listOutgoingRequests = exports.listIncomingRequests = exports.createFriendRequest = exports.searchUsers = exports.ensureAcceptedFriendship = void 0;
const client_1 = require("@prisma/client");
const app_error_1 = require("../../common/errors/app-error");
const prisma_1 = require("../../config/prisma");
const friendPairWhere = (userAId, userBId) => ({
    OR: [
        { requesterId: userAId, addresseeId: userBId },
        { requesterId: userBId, addresseeId: userAId }
    ]
});
const ensureAcceptedFriendship = async (userAId, userBId) => {
    const relation = await prisma_1.prisma.friend.findFirst({
        where: {
            ...friendPairWhere(userAId, userBId),
            status: client_1.FriendStatus.ACCEPTED
        },
        select: { id: true }
    });
    if (!relation) {
        throw new app_error_1.AppError("You can only chat with accepted friends", 403);
    }
};
exports.ensureAcceptedFriendship = ensureAcceptedFriendship;
const searchUsers = async (userId, keyword, limit) => {
    const users = await prisma_1.prisma.user.findMany({
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
    const relations = await prisma_1.prisma.friend.findMany({
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
        const relation = relations.find((item) => (item.requesterId === userId && item.addresseeId === user.id) ||
            (item.requesterId === user.id && item.addresseeId === userId));
        return {
            ...user,
            friendship: relation
                ? {
                    friendId: relation.id,
                    status: relation.status,
                    direction: relation.requesterId === userId ? "outgoing" : "incoming"
                }
                : null
        };
    });
};
exports.searchUsers = searchUsers;
const createFriendRequest = async (userId, targetUserId) => {
    if (userId === targetUserId) {
        throw new app_error_1.AppError("Cannot send friend request to yourself", 400);
    }
    const targetUser = await prisma_1.prisma.user.findFirst({
        where: {
            id: targetUserId,
            deletedAt: null,
            blockedAt: null
        },
        select: { id: true }
    });
    if (!targetUser) {
        throw new app_error_1.AppError("Target user not found", 404);
    }
    const existing = await prisma_1.prisma.friend.findFirst({
        where: friendPairWhere(userId, targetUserId)
    });
    if (!existing) {
        return prisma_1.prisma.friend.create({
            data: {
                requesterId: userId,
                addresseeId: targetUserId,
                status: client_1.FriendStatus.PENDING,
                requestedAt: new Date(),
                respondedAt: null,
                blockedById: null
            }
        });
    }
    if (existing.status === client_1.FriendStatus.ACCEPTED) {
        throw new app_error_1.AppError("Already friends", 409);
    }
    if (existing.status === client_1.FriendStatus.PENDING) {
        if (existing.requesterId === userId) {
            throw new app_error_1.AppError("Friend request already sent", 409);
        }
        throw new app_error_1.AppError("You already have an incoming friend request from this user", 409, {
            friendId: existing.id
        });
    }
    if (existing.status === client_1.FriendStatus.BLOCKED && existing.blockedById !== userId) {
        throw new app_error_1.AppError("You cannot send friend request to this user", 403);
    }
    return prisma_1.prisma.friend.update({
        where: { id: existing.id },
        data: {
            requesterId: userId,
            addresseeId: targetUserId,
            status: client_1.FriendStatus.PENDING,
            requestedAt: new Date(),
            respondedAt: null,
            blockedById: null
        }
    });
};
exports.createFriendRequest = createFriendRequest;
const listIncomingRequests = async (userId) => {
    return prisma_1.prisma.friend.findMany({
        where: {
            addresseeId: userId,
            status: client_1.FriendStatus.PENDING
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
exports.listIncomingRequests = listIncomingRequests;
const listOutgoingRequests = async (userId) => {
    return prisma_1.prisma.friend.findMany({
        where: {
            requesterId: userId,
            status: client_1.FriendStatus.PENDING
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
exports.listOutgoingRequests = listOutgoingRequests;
const acceptFriendRequest = async (userId, friendId) => {
    const request = await prisma_1.prisma.friend.findUnique({
        where: { id: friendId },
        select: {
            id: true,
            addresseeId: true,
            status: true
        }
    });
    if (!request) {
        throw new app_error_1.AppError("Friend request not found", 404);
    }
    if (request.addresseeId !== userId) {
        throw new app_error_1.AppError("Forbidden", 403);
    }
    if (request.status !== client_1.FriendStatus.PENDING) {
        throw new app_error_1.AppError("Friend request is not pending", 409);
    }
    return prisma_1.prisma.friend.update({
        where: { id: friendId },
        data: {
            status: client_1.FriendStatus.ACCEPTED,
            respondedAt: new Date(),
            blockedById: null
        }
    });
};
exports.acceptFriendRequest = acceptFriendRequest;
const rejectFriendRequest = async (userId, friendId) => {
    const request = await prisma_1.prisma.friend.findUnique({
        where: { id: friendId },
        select: {
            id: true,
            addresseeId: true,
            status: true
        }
    });
    if (!request) {
        throw new app_error_1.AppError("Friend request not found", 404);
    }
    if (request.addresseeId !== userId) {
        throw new app_error_1.AppError("Forbidden", 403);
    }
    if (request.status !== client_1.FriendStatus.PENDING) {
        throw new app_error_1.AppError("Friend request is not pending", 409);
    }
    return prisma_1.prisma.friend.update({
        where: { id: friendId },
        data: {
            status: client_1.FriendStatus.REJECTED,
            respondedAt: new Date()
        }
    });
};
exports.rejectFriendRequest = rejectFriendRequest;
const cancelOutgoingFriendRequest = async (userId, friendId) => {
    const request = await prisma_1.prisma.friend.findUnique({
        where: { id: friendId },
        select: {
            id: true,
            requesterId: true,
            addresseeId: true,
            status: true
        }
    });
    if (!request) {
        throw new app_error_1.AppError("Friend request not found", 404);
    }
    if (request.requesterId !== userId) {
        throw new app_error_1.AppError("Forbidden", 403);
    }
    if (request.status !== client_1.FriendStatus.PENDING) {
        throw new app_error_1.AppError("Friend request is not pending", 409);
    }
    await prisma_1.prisma.friend.delete({ where: { id: friendId } });
    return {
        success: true,
        requesterId: request.requesterId,
        addresseeId: request.addresseeId
    };
};
exports.cancelOutgoingFriendRequest = cancelOutgoingFriendRequest;
const listFriends = async (userId) => {
    const items = await prisma_1.prisma.friend.findMany({
        where: {
            status: client_1.FriendStatus.ACCEPTED,
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
exports.listFriends = listFriends;
const unfriend = async (userId, otherUserId) => {
    if (userId === otherUserId) {
        throw new app_error_1.AppError("Invalid unfriend target", 400);
    }
    const relation = await prisma_1.prisma.friend.findFirst({
        where: {
            ...friendPairWhere(userId, otherUserId),
            status: client_1.FriendStatus.ACCEPTED
        },
        select: { id: true }
    });
    if (!relation) {
        throw new app_error_1.AppError("Friend relationship not found", 404);
    }
    await prisma_1.prisma.friend.delete({ where: { id: relation.id } });
    return {
        success: true,
        requesterId: userId,
        addresseeId: otherUserId
    };
};
exports.unfriend = unfriend;
