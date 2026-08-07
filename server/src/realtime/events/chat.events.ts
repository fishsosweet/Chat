import { MessageState, MessageType } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { MessageSyncPayload, SeenPayload, SendMessagePayload, TypingPayload } from "../types/socket.types";

export const conversationRoomKey = (conversationId: string): string => `conversation:${conversationId}`;
export const userRoomKey = (userId: string): string => `user:${userId}`;

const ensureMember = async (conversationId: string, userId: string): Promise<void> => {
  const member = await prisma.member.findFirst({
    where: {
      conversationId,
      userId,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  if (!member) {
    throw new Error("Forbidden conversation access");
  }
};

const emitError = (socket: Socket, error: unknown): void => {
  logger.warn({ err: error, socketId: socket.id }, "Socket event error");
  socket.emit("socket_error", {
    message: error instanceof Error ? error.message : "Unexpected socket error"
  });
};

export const registerChatEvents = (io: Server, socket: Socket): void => {
  socket.on("typing", async (payload: TypingPayload) => {
    try {
      await ensureMember(payload.conversationId, socket.data.auth.userId);
      socket.to(conversationRoomKey(payload.conversationId)).emit("typing", {
        conversationId: payload.conversationId,
        userId: socket.data.auth.userId
      });
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("stop_typing", async (payload: TypingPayload) => {
    try {
      await ensureMember(payload.conversationId, socket.data.auth.userId);
      socket.to(conversationRoomKey(payload.conversationId)).emit("stop_typing", {
        conversationId: payload.conversationId,
        userId: socket.data.auth.userId
      });
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("send_message", async (payload: SendMessagePayload, ack?: (data: unknown) => void) => {
    try {
      if (!payload.conversationId) {
        throw new Error("conversationId is required");
      }

      await ensureMember(payload.conversationId, socket.data.auth.userId);

      const message = await prisma.message.create({
        data: {
          conversationId: payload.conversationId,
          senderId: socket.data.auth.userId,
          type: payload.type ?? MessageType.TEXT,
          state: MessageState.SENT,
          content: payload.content,
          clientMessageId: payload.clientMessageId,
          replyToMessageId: payload.replyToMessageId
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true
            }
          }
        }
      });

      await prisma.conversation.update({
        where: { id: payload.conversationId },
        data: {
          lastMessageId: message.id,
          lastMessageAt: message.createdAt,
          messageCount: { increment: BigInt(1) }
        }
      });

      const members = await prisma.member.findMany({
        where: { conversationId: payload.conversationId, status: "ACTIVE" },
        select: { userId: true }
      });

      await prisma.messageReceipt.createMany({
        data: members
          .filter((member) => member.userId !== socket.data.auth.userId)
          .map((member) => ({
            messageId: message.id,
            userId: member.userId,
            deliveredAt: new Date()
          })),
        skipDuplicates: true
      });

      io.to(conversationRoomKey(payload.conversationId)).emit("receive_message", {
        conversationId: payload.conversationId,
        message
      });

      socket.emit("delivered", {
        conversationId: payload.conversationId,
        messageId: message.id
      });

      ack?.({ success: true, messageId: message.id, serverTime: new Date().toISOString() });
    } catch (error) {
      ack?.({ success: false, error: error instanceof Error ? error.message : "Failed to send message" });
      emitError(socket, error);
    }
  });

  socket.on("delivered", async (payload: SeenPayload) => {
    try {
      await ensureMember(payload.conversationId, socket.data.auth.userId);
      await prisma.messageReceipt.upsert({
        where: {
          messageId_userId: {
            messageId: payload.messageId,
            userId: socket.data.auth.userId
          }
        },
        create: {
          messageId: payload.messageId,
          userId: socket.data.auth.userId,
          deliveredAt: new Date()
        },
        update: {
          deliveredAt: new Date()
        }
      });

      socket.to(conversationRoomKey(payload.conversationId)).emit("delivered", {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        userId: socket.data.auth.userId
      });
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("seen", async (payload: SeenPayload) => {
    try {
      await ensureMember(payload.conversationId, socket.data.auth.userId);
      await prisma.messageReceipt.upsert({
        where: {
          messageId_userId: {
            messageId: payload.messageId,
            userId: socket.data.auth.userId
          }
        },
        create: {
          messageId: payload.messageId,
          userId: socket.data.auth.userId,
          deliveredAt: new Date(),
          seenAt: new Date()
        },
        update: {
          deliveredAt: new Date(),
          seenAt: new Date()
        }
      });

      socket.to(conversationRoomKey(payload.conversationId)).emit("seen", {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        userId: socket.data.auth.userId,
        seenAt: new Date().toISOString()
      });
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("sync_messages", async (payload: MessageSyncPayload, ack?: (data: unknown) => void) => {
    try {
      await ensureMember(payload.conversationId, socket.data.auth.userId);

      const limit = Math.max(1, Math.min(payload.limit ?? 50, 200));
      const sinceDate = payload.since ? new Date(payload.since) : undefined;

      const messages = await prisma.message.findMany({
        where: {
          conversationId: payload.conversationId,
          ...(sinceDate ? { createdAt: { gt: sinceDate } } : {})
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
        orderBy: { createdAt: "asc" },
        take: limit
      });

      ack?.({ success: true, messages, count: messages.length });
    } catch (error) {
      ack?.({ success: false, error: error instanceof Error ? error.message : "Sync failed" });
      emitError(socket, error);
    }
  });
};
