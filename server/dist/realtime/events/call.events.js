"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCallEvents = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const logger_1 = require("../../config/logger");
const node_crypto_1 = require("node:crypto");
const call_lifecycle_service_1 = require("../services/call-lifecycle.service");
const friends_service_1 = require("../../modules/friends/friends.service");
const conversationRoomKey = (conversationId) => `conversation:${conversationId}`;
const userRoomKey = (userId) => `user:${userId}`;
const ensureMember = async (conversationId, userId) => {
    const member = await prisma_1.prisma.member.findFirst({
        where: {
            conversationId,
            userId,
            status: client_1.MemberStatus.ACTIVE
        },
        select: { id: true }
    });
    if (!member) {
        throw new Error("Forbidden conversation access");
    }
};
const ensureDirectConversationFriendship = async (conversationId, actorUserId, payloadTargetUserId) => {
    const conversation = await prisma_1.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
            type: true,
            members: {
                where: { status: client_1.MemberStatus.ACTIVE },
                select: { userId: true }
            }
        }
    });
    if (!conversation || conversation.type !== client_1.ConversationType.DIRECT) {
        return;
    }
    const counterpartUserId = payloadTargetUserId ?? conversation.members.find((member) => member.userId !== actorUserId)?.userId;
    if (!counterpartUserId) {
        throw new Error("Direct conversation counterpart not found");
    }
    await (0, friends_service_1.ensureAcceptedFriendship)(actorUserId, counterpartUserId);
};
const emitSignal = (io, socket, eventName, payload) => {
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
const forwardEvent = (io, socket, eventName, beforeEmit) => {
    socket.on(eventName, async (originalPayload) => {
        try {
            if (!originalPayload?.conversationId) {
                socket.emit("socket_error", { message: `${eventName}: conversationId is required` });
                return;
            }
            await ensureMember(originalPayload.conversationId, socket.data.auth.userId);
            await ensureDirectConversationFriendship(originalPayload.conversationId, socket.data.auth.userId, originalPayload.targetUserId);
            const payload = beforeEmit ? await beforeEmit(originalPayload) : originalPayload;
            emitSignal(io, socket, eventName, payload);
        }
        catch (error) {
            logger_1.logger.warn({ err: error, socketId: socket.id, eventName }, "Call signaling error");
            socket.emit("socket_error", {
                message: error instanceof Error ? error.message : `${eventName}: failed`
            });
        }
    });
};
const registerCallEvents = (io, socket) => {
    forwardEvent(io, socket, "call", async (payload) => {
        const callId = payload.callId ?? (0, node_crypto_1.randomUUID)();
        const callType = payload.callType ?? "VOICE";
        await (0, call_lifecycle_service_1.createCallInvite)({
            callId,
            conversationId: payload.conversationId,
            callerId: socket.data.auth.userId,
            callType: callType,
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
        await (0, call_lifecycle_service_1.markCallAnswered)({
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
        const currentCall = await prisma_1.prisma.call.findUnique({
            where: { id: payload.callId },
            select: { startedAt: true, callerId: true }
        });
        if (currentCall && currentCall.callerId === socket.data.auth.userId && !currentCall.startedAt) {
            await (0, call_lifecycle_service_1.markCallCanceled)({
                callId: payload.callId,
                userId: socket.data.auth.userId,
                conversationId: payload.conversationId
            });
        }
        else {
            await (0, call_lifecycle_service_1.markCallRejected)({
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
        await (0, call_lifecycle_service_1.markCallEnded)({
            callId: payload.callId,
            userId: socket.data.auth.userId,
            conversationId: payload.conversationId
        });
        return payload;
    });
};
exports.registerCallEvents = registerCallEvents;
