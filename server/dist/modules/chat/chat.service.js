"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrGetDirectConversation = exports.getConversationMessages = exports.listConversations = void 0;
const client_1 = require("@prisma/client");
const app_error_1 = require("../../common/errors/app-error");
const prisma_1 = require("../../config/prisma");
const friends_service_1 = require("../friends/friends.service");
const normalizeDirectConversation = (conversation, viewerUserId) => {
    if (conversation.type !== client_1.ConversationType.DIRECT) {
        return {
            title: conversation.title ?? "Group",
            avatarUrl: conversation.avatarUrl,
            counterpartId: null
        };
    }
    const counterpart = conversation.members.find((member) => member.user.id !== viewerUserId)?.user;
    return {
        title: conversation.title ?? counterpart?.fullName ?? "Direct chat",
        avatarUrl: conversation.avatarUrl ?? counterpart?.avatarUrl ?? null,
        counterpartId: counterpart?.id ?? null
    };
};
const listConversations = async (userId, cursor, limit) => {
    const take = Math.min(Math.max(limit, 1), 50);
    const cursorDate = cursor ? new Date(cursor) : undefined;
    const memberships = await prisma_1.prisma.member.findMany({
        where: {
            userId,
            status: client_1.MemberStatus.ACTIVE,
            conversation: {
                ...(cursorDate ? { lastMessageAt: { lt: cursorDate } } : {})
            }
        },
        orderBy: {
            conversation: {
                lastMessageAt: "desc"
            }
        },
        take: take + 1,
        select: {
            conversation: {
                select: {
                    id: true,
                    type: true,
                    title: true,
                    avatarUrl: true,
                    lastMessageAt: true,
                    members: {
                        where: { status: client_1.MemberStatus.ACTIVE },
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    avatarUrl: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            messages: true
                        }
                    }
                }
            }
        }
    });
    const hasMore = memberships.length > take;
    const pageItems = hasMore ? memberships.slice(0, take) : memberships;
    const conversations = await Promise.all(pageItems.map(async ({ conversation }) => {
        const direct = normalizeDirectConversation(conversation, userId);
        const unreadCount = await prisma_1.prisma.messageReceipt.count({
            where: {
                userId,
                seenAt: null,
                message: {
                    conversationId: conversation.id,
                    senderId: { not: userId }
                }
            }
        });
        return {
            id: conversation.id,
            title: direct.title,
            avatarUrl: direct.avatarUrl,
            counterpartUserId: direct.counterpartId,
            lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
            unreadCount
        };
    }));
    const nextCursor = hasMore
        ? pageItems[pageItems.length - 1]?.conversation.lastMessageAt?.toISOString() ?? new Date().toISOString()
        : null;
    return {
        items: conversations,
        nextCursor
    };
};
exports.listConversations = listConversations;
const getConversationMessages = async (userId, conversationId, cursor, limit) => {
    const membership = await prisma_1.prisma.member.findFirst({
        where: {
            userId,
            conversationId,
            status: client_1.MemberStatus.ACTIVE
        },
        select: { id: true }
    });
    if (!membership) {
        throw new app_error_1.AppError("Forbidden conversation access", 403);
    }
    const take = Math.min(Math.max(limit, 1), 100);
    const cursorDate = cursor ? new Date(cursor) : undefined;
    const messages = await prisma_1.prisma.message.findMany({
        where: {
            conversationId,
            ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
        },
        include: {
            sender: {
                select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: { createdAt: "desc" },
        take: take + 1
    });
    const hasMore = messages.length > take;
    const pageItems = hasMore ? messages.slice(0, take) : messages;
    return {
        items: pageItems.reverse().map((item) => ({
            id: item.id,
            conversationId: item.conversationId,
            senderId: item.senderId,
            sender: item.sender,
            type: item.type,
            content: item.content,
            state: item.state,
            replyToMessageId: item.replyToMessageId,
            createdAt: item.createdAt.toISOString()
        })),
        nextCursor: hasMore ? pageItems[pageItems.length - 1]?.createdAt.toISOString() ?? null : null
    };
};
exports.getConversationMessages = getConversationMessages;
const createOrGetDirectConversation = async (userId, targetUserId) => {
    if (userId === targetUserId) {
        throw new app_error_1.AppError("Cannot create direct chat with yourself", 400);
    }
    const targetUser = await prisma_1.prisma.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
        select: { id: true, fullName: true, avatarUrl: true }
    });
    if (!targetUser) {
        throw new app_error_1.AppError("Target user not found", 404);
    }
    await (0, friends_service_1.ensureAcceptedFriendship)(userId, targetUserId);
    const directKey = [userId, targetUserId].sort().join(":");
    const conversation = await prisma_1.prisma.conversation.upsert({
        where: { directKey },
        update: {},
        create: {
            type: client_1.ConversationType.DIRECT,
            directKey,
            title: null,
            createdById: userId,
            members: {
                create: [
                    {
                        userId,
                        role: client_1.MemberRole.MEMBER,
                        status: client_1.MemberStatus.ACTIVE
                    },
                    {
                        userId: targetUserId,
                        role: client_1.MemberRole.MEMBER,
                        status: client_1.MemberStatus.ACTIVE
                    }
                ]
            }
        },
        select: {
            id: true,
            title: true,
            avatarUrl: true,
            lastMessageAt: true,
            type: true
        }
    });
    await prisma_1.prisma.member.updateMany({
        where: {
            conversationId: conversation.id,
            userId: { in: [userId, targetUserId] }
        },
        data: {
            status: client_1.MemberStatus.ACTIVE,
            leftAt: null
        }
    });
    return {
        id: conversation.id,
        title: targetUser.fullName,
        avatarUrl: targetUser.avatarUrl,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null
    };
};
exports.createOrGetDirectConversation = createOrGetDirectConversation;
