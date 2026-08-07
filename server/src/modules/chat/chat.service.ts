import { ConversationType, MemberRole, MemberStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { prisma } from "../../config/prisma";
import { ensureAcceptedFriendship } from "../friends/friends.service";

export interface ConversationListResult {
  items: Array<{
    id: string;
    type: ConversationType;
    title: string;
    avatarUrl: string | null;
    counterpartUserId: string | null;
    memberCount: number;
    lastMessageAt: string | null;
    unreadCount: number;
  }>;
  nextCursor: string | null;
}

const normalizeConversation = (
  conversation: {
    id: string;
    type: ConversationType;
    title: string | null;
    avatarUrl: string | null;
    lastMessageAt: Date | null;
    group: {
      name: string;
      avatarUrl: string | null;
    } | null;
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
  if (conversation.type === ConversationType.GROUP) {
    return {
      title: conversation.group?.name ?? conversation.title ?? "Group",
      avatarUrl: conversation.group?.avatarUrl ?? conversation.avatarUrl,
      counterpartId: null as string | null,
      memberCount: conversation.members.length
    };
  }

  const counterpart = conversation.members.find((member) => member.user.id !== viewerUserId)?.user;
  return {
    title: conversation.title ?? counterpart?.fullName ?? "Direct chat",
    avatarUrl: conversation.avatarUrl ?? counterpart?.avatarUrl ?? null,
    counterpartId: counterpart?.id ?? null,
    memberCount: conversation.members.length
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
          group: {
            select: {
              name: true,
              avatarUrl: true
            }
          },
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
      const normalized = normalizeConversation(conversation, userId);
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
        type: conversation.type,
        title: normalized.title,
        avatarUrl: normalized.avatarUrl,
        counterpartUserId: normalized.counterpartId,
        memberCount: normalized.memberCount,
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
      replyToMessageId: item.replyToMessageId,
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

const ensureActiveGroupMember = async (conversationId: string, userId: string) => {
  const member = await prisma.member.findFirst({
    where: {
      conversationId,
      userId,
      status: MemberStatus.ACTIVE,
      conversation: { type: ConversationType.GROUP }
    },
    select: { id: true, role: true }
  });

  if (!member) {
    throw new AppError("Forbidden group access", 403);
  }

  return member;
};

const ensureGroupAdmin = async (conversationId: string, userId: string) => {
  const member = await ensureActiveGroupMember(conversationId, userId);

  if (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN) {
    throw new AppError("Only group owner or admin can perform this action", 403);
  }

  return member;
};

const validateGroupMemberCandidates = async (actorUserId: string, candidateUserIds: string[]) => {
  const uniqueIds = [...new Set(candidateUserIds.filter((id) => id !== actorUserId))];

  if (!uniqueIds.length) {
    return uniqueIds;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, deletedAt: null, blockedAt: null },
    select: { id: true }
  });

  if (users.length !== uniqueIds.length) {
    throw new AppError("One or more users not found", 404);
  }

  for (const candidateId of uniqueIds) {
    await ensureAcceptedFriendship(actorUserId, candidateId);
  }

  return uniqueIds;
};

export const createGroup = async (
  userId: string,
  name: string,
  memberUserIds: string[],
  description?: string
) => {
  const uniqueMemberIds = await validateGroupMemberCandidates(userId, memberUserIds);

  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title: name,
        createdById: userId,
        members: {
          create: [
            {
              userId,
              role: MemberRole.OWNER,
              status: MemberStatus.ACTIVE
            },
            ...uniqueMemberIds.map((memberId) => ({
              userId: memberId,
              role: MemberRole.MEMBER,
              status: MemberStatus.ACTIVE
            }))
          ]
        },
        group: {
          create: {
            ownerId: userId,
            name,
            description: description ?? null
          }
        }
      },
      select: {
        id: true,
        type: true,
        lastMessageAt: true,
        group: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        members: {
          where: { status: MemberStatus.ACTIVE },
          select: { userId: true }
        }
      }
    });

    return created;
  });

  return {
    id: conversation.id,
    type: conversation.type,
    title: conversation.group?.name ?? name,
    avatarUrl: conversation.group?.avatarUrl ?? null,
    memberCount: conversation.members.length,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    memberUserIds: conversation.members.map((member) => member.userId)
  };
};

export const getGroupMembers = async (userId: string, conversationId: string) => {
  await ensureActiveGroupMember(conversationId, userId);

  const members = await prisma.member.findMany({
    where: {
      conversationId,
      status: MemberStatus.ACTIVE
    },
    select: {
      userId: true,
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          email: true
        }
      }
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
  });

  return members.map((member) => ({
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
    user: member.user
  }));
};

export const addGroupMembers = async (userId: string, conversationId: string, memberUserIds: string[]) => {
  await ensureGroupAdmin(conversationId, userId);

  const group = await prisma.group.findFirst({
    where: { conversationId },
    select: { maxMembers: true }
  });

  if (!group) {
    throw new AppError("Group not found", 404);
  }

  const uniqueMemberIds = await validateGroupMemberCandidates(userId, memberUserIds);

  if (!uniqueMemberIds.length) {
    throw new AppError("No valid members to add", 400);
  }

  const activeCount = await prisma.member.count({
    where: { conversationId, status: MemberStatus.ACTIVE }
  });

  const existingMembers = await prisma.member.findMany({
    where: { conversationId, userId: { in: uniqueMemberIds } },
    select: { userId: true, status: true }
  });

  const alreadyActiveIds = new Set(
    existingMembers.filter((member) => member.status === MemberStatus.ACTIVE).map((member) => member.userId)
  );

  const pendingIds = uniqueMemberIds.filter((candidateId) => !alreadyActiveIds.has(candidateId));

  const toReactivate = existingMembers
    .filter((member) => member.status !== MemberStatus.ACTIVE && pendingIds.includes(member.userId))
    .map((member) => member.userId);

  const toCreate = pendingIds.filter(
    (candidateId) => !existingMembers.some((member) => member.userId === candidateId)
  );

  const netNewCount = toCreate.length + toReactivate.length;
  if (netNewCount === 0) {
    return {
      addedUserIds: [],
      members: await getGroupMembers(userId, conversationId)
    };
  }

  if (activeCount + netNewCount > group.maxMembers) {
    throw new AppError("Group member limit reached", 400);
  }

  if (toReactivate.length) {
    await prisma.member.updateMany({
      where: { conversationId, userId: { in: toReactivate } },
      data: {
        status: MemberStatus.ACTIVE,
        role: MemberRole.MEMBER,
        leftAt: null
      }
    });
  }

  if (toCreate.length) {
    await prisma.member.createMany({
      data: toCreate.map((memberId) => ({
        conversationId,
        userId: memberId,
        role: MemberRole.MEMBER,
        status: MemberStatus.ACTIVE
      })),
      skipDuplicates: true
    });
  }

  const addedUserIds = [...toCreate, ...toReactivate];

  return {
    addedUserIds,
    members: await getGroupMembers(userId, conversationId)
  };
};

export const removeGroupMember = async (userId: string, conversationId: string, targetUserId: string) => {
  const isSelfLeave = userId === targetUserId;

  if (isSelfLeave) {
    const member = await ensureActiveGroupMember(conversationId, userId);
    if (member.role === MemberRole.OWNER) {
      throw new AppError("Group owner cannot leave. Transfer ownership first.", 400);
    }
  } else {
    await ensureGroupAdmin(conversationId, userId);
  }

  const targetMember = await prisma.member.findFirst({
    where: { conversationId, userId: targetUserId, status: MemberStatus.ACTIVE },
    select: { id: true, role: true }
  });

  if (!targetMember) {
    throw new AppError("Member not found in group", 404);
  }

  if (!isSelfLeave && targetMember.role === MemberRole.OWNER) {
    throw new AppError("Cannot remove group owner", 403);
  }

  if (!isSelfLeave && targetMember.role === MemberRole.ADMIN && userId !== targetUserId) {
    const actor = await prisma.member.findFirst({
      where: { conversationId, userId, status: MemberStatus.ACTIVE },
      select: { role: true }
    });
    if (actor?.role !== MemberRole.OWNER) {
      throw new AppError("Only owner can remove admin", 403);
    }
  }

  await prisma.member.update({
    where: { id: targetMember.id },
    data: {
      status: isSelfLeave ? MemberStatus.LEFT : MemberStatus.KICKED,
      leftAt: new Date()
    }
  });

  return {
    removedUserId: targetUserId,
    action: isSelfLeave ? ("left" as const) : ("removed" as const),
    members: isSelfLeave ? [] : await getGroupMembers(userId, conversationId)
  };
};
