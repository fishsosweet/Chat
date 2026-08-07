import { Server, Socket } from "socket.io";
import { CallType, ConversationType, MemberStatus } from "@prisma/client";
import { SignalingPayload } from "../types/socket.types";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { randomUUID } from "node:crypto";
import {
  createCallInvite,
  markCallAnswered,
  markCallCanceled,
  markCallEnded,
  markCallRejected
} from "../services/call-lifecycle.service";
import { ensureAcceptedFriendship } from "../../modules/friends/friends.service";

const conversationRoomKey = (conversationId: string): string => `conversation:${conversationId}`;
const userRoomKey = (userId: string): string => `user:${userId}`;

const ensureMember = async (conversationId: string, userId: string): Promise<void> => {
  const member = await prisma.member.findFirst({
    where: {
      conversationId,
      userId,
      status: MemberStatus.ACTIVE
    },
    select: { id: true }
  });

  if (!member) {
    throw new Error("Forbidden conversation access");
  }
};

const ensureDirectConversationFriendship = async (
  conversationId: string,
  actorUserId: string,
  payloadTargetUserId?: string
): Promise<void> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      type: true,
      members: {
        where: { status: MemberStatus.ACTIVE },
        select: { userId: true }
      }
    }
  });

  if (!conversation || conversation.type !== ConversationType.DIRECT) {
    return;
  }

  const counterpartUserId =
    payloadTargetUserId ?? conversation.members.find((member) => member.userId !== actorUserId)?.userId;

  if (!counterpartUserId) {
    throw new Error("Direct conversation counterpart not found");
  }

  await ensureAcceptedFriendship(actorUserId, counterpartUserId);
};

const emitSignal = (io: Server, socket: Socket, eventName: string, payload: SignalingPayload) => {
  const signalPayload = {
    ...payload,
    fromUserId: socket.data.auth.userId,
    at: new Date().toISOString()
  };

  if (payload.targetUserId) {
    io.to(userRoomKey(payload.targetUserId)).emit(eventName, signalPayload);
    return;
  }

  socket.to(conversationRoomKey(payload.conversationId)).emit(eventName, signalPayload);
};

const forwardEvent = (
  io: Server,
  socket: Socket,
  eventName: string,
  beforeEmit?: (payload: SignalingPayload) => Promise<SignalingPayload>
) => {
  socket.on(eventName, async (originalPayload: SignalingPayload) => {
    try {
      if (!originalPayload?.conversationId) {
        socket.emit("socket_error", { message: `${eventName}: conversationId is required` });
        return;
      }

      await ensureMember(originalPayload.conversationId, socket.data.auth.userId);
      await ensureDirectConversationFriendship(
        originalPayload.conversationId,
        socket.data.auth.userId,
        originalPayload.targetUserId
      );

      const payload = beforeEmit ? await beforeEmit(originalPayload) : originalPayload;

      emitSignal(io, socket, eventName, payload);
    } catch (error) {
      logger.warn({ err: error, socketId: socket.id, eventName }, "Call signaling error");
      socket.emit("socket_error", {
        message: error instanceof Error ? error.message : `${eventName}: failed`
      });
    }
  });
};

export const registerCallEvents = (io: Server, socket: Socket): void => {
  forwardEvent(io, socket, "call", async (payload) => {
    const callId = payload.callId ?? randomUUID();
    const callType = payload.callType ?? "VOICE";

    await createCallInvite({
      callId,
      conversationId: payload.conversationId,
      callerId: socket.data.auth.userId,
      callType: callType as CallType,
      targetUserId: payload.targetUserId
    });

    return {
      ...payload,
      callId,
      callType
    };
  });

  forwardEvent(io, socket, "answer", async (payload) => {
    if (!payload.callId) {
      throw new Error("answer: callId is required");
    }

    await markCallAnswered({
      callId: payload.callId,
      userId: socket.data.auth.userId,
      conversationId: payload.conversationId
    });

    return payload;
  });

  forwardEvent(io, socket, "reject", async (payload) => {
    if (!payload.callId) {
      throw new Error("reject: callId is required");
    }

    const currentCall = await prisma.call.findUnique({
      where: { id: payload.callId },
      select: { startedAt: true, callerId: true }
    });

    if (currentCall && currentCall.callerId === socket.data.auth.userId && !currentCall.startedAt) {
      await markCallCanceled({
        callId: payload.callId,
        userId: socket.data.auth.userId,
        conversationId: payload.conversationId
      });
    } else {
      await markCallRejected({
        callId: payload.callId,
        userId: socket.data.auth.userId,
        conversationId: payload.conversationId
      });
    }

    return payload;
  });

  forwardEvent(io, socket, "offer");
  forwardEvent(io, socket, "ice_candidate");

  forwardEvent(io, socket, "end", async (payload) => {
    if (!payload.callId) {
      throw new Error("end: callId is required");
    }

    await markCallEnded({
      callId: payload.callId,
      userId: socket.data.auth.userId,
      conversationId: payload.conversationId
    });

    return payload;
  });
};
