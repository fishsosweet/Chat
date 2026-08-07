import { ConversationType, MemberRole, MemberStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { prisma } from "../../config/prisma";
import { ensureAcceptedFriendship } from "../friends/friends.service";

export interface ConversationListResult {
  items: Array<{
    id: string;
    title: string;
    avatarUrl: string | null;
    counterpartUserId: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
  }>;
  nextCursor: string | null;
}

const normalizeDirectConversation = (
  conversation: {
    id: string;
    type: ConversationType;
    title: string | null;
    avatarUrl: string | null;
    lastMessageAt: Date | null;
    members: Array<{
      user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
      };
    }>;
    _count: {
      messages: number;
    };
  },
  viewerUserId: string
) => {
  if (conversation.type !== ConversationType.DIRECT) {
    return {
      title: conversation.title ?? "Group",
      avatarUrl: conversation.avatarUrl,
      counterpartId: null as string | null
    };
  }

  const counterpart = conversation.members.find((member) => member.user.id !== viewerUserId)?.user;
  return {
    title: conversation.title ?? counterpart?.fullName ?? "Direct chat",
    avatarUrl: conversation.avatarUrl ?? counterpart?.avatarUrl ?? null,
    counterpartId: counterpart?.id ?? null
  };
};

export const listConversations = async (
  userId: string,
  cursor: string | undefined,
  limit: number
): Promise<ConversationListResult> => {
  const take = Math.min(Math.max(limit, 1), 50);
  const cursorDate = cursor ? new Date(cursor) : undefined;

  const memberships = await prisma.member.findMany({
    where: {
      userId,
      status: MemberStatus.ACTIVE,
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
            where: { status: MemberStatus.ACTIVE },
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

  const conversations = await Promise.all(
    pageItems.map(async ({ conversation }) => {
      const direct = normalizeDirectConversation(conversation, userId);
      const unreadCount = await prisma.messageReceipt.count({
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
    })
  );

  const nextCursor = hasMore
    ? pageItems[pageItems.length - 1]?.conversation.lastMessageAt?.toISOString() ?? new Date().toISOString()
    : null;

  return {
    items: conversations,
    nextCursor
  };
};

export const getConversationMessages = async (
  userId: string,
  conversationId: string,
  cursor: string | undefined,
  limit: number
) => {
  const membership = await prisma.member.findFirst({
    where: {
      userId,
      conversationId,
      status: MemberStatus.ACTIVE
    },
    select: { id: true }
  });

  if (!membership) {
    throw new AppError("Forbidden conversation access", 403);
  }

  const take = Math.min(Math.max(limit, 1), 100);
  const cursorDate = cursor ? new Date(cursor) : undefined;

  const messages = await prisma.message.findMany({
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
      createdAt: item.createdAt.toISOString()
    })),
    nextCursor: hasMore ? pageItems[pageItems.length - 1]?.createdAt.toISOString() ?? null : null
  };
};

export const createOrGetDirectConversation = async (userId: string, targetUserId: string) => {
  if (userId === targetUserId) {
    throw new AppError("Cannot create direct chat with yourself", 400);
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true, fullName: true, avatarUrl: true }
  });

  if (!targetUser) {
    throw new AppError("Target user not found", 404);
  }

  await ensureAcceptedFriendship(userId, targetUserId);

  const directKey = [userId, targetUserId].sort().join(":");

  const conversation = await prisma.conversation.upsert({
    where: { directKey },
    update: {},
    create: {
      type: ConversationType.DIRECT,
      directKey,
      title: null,
      createdById: userId,
      members: {
        create: [
          {
            userId,
            role: MemberRole.MEMBER,
            status: MemberStatus.ACTIVE
          },
          {
            userId: targetUserId,
            role: MemberRole.MEMBER,
            status: MemberStatus.ACTIVE
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

  await prisma.member.updateMany({
    where: {
      conversationId: conversation.id,
      userId: { in: [userId, targetUserId] }
    },
    data: {
      status: MemberStatus.ACTIVE,
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
