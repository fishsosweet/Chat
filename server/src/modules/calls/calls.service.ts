import { CallStatus, MemberStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export const getMyCallHistory = async (
  userId: string,
  page: number,
  limit: number,
  status?: CallStatus
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.CallWhereInput = {
    participants: {
      some: {
        userId
      }
    },
    ...(status ? { status } : {})
  };

  const [items, total] = await Promise.all([
    prisma.call.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        caller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
          }
        },
        participants: {
          where: {
            userId: { not: userId }
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        },
        conversation: {
          select: {
            id: true,
            type: true,
            title: true,
            members: {
              where: {
                status: MemberStatus.ACTIVE,
                userId: { not: userId }
              },
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.call.count({ where })
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      conversationId: item.conversationId,
      type: item.type,
      status: item.status,
      startedAt: item.startedAt?.toISOString() ?? null,
      endedAt: item.endedAt?.toISOString() ?? null,
      durationSec: item.durationSec,
      createdAt: item.createdAt.toISOString(),
      caller: item.caller,
      peers: item.participants.map((participant) => participant.user),
      conversationTitle:
        item.conversation.title ?? item.conversation.members[0]?.user.fullName ?? "Conversation"
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
