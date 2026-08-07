"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markCallCanceled = exports.markCallEnded = exports.markCallRejected = exports.markCallAnswered = exports.createCallInvite = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const ensureActiveMember = async (conversationId, userId) => {
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
const createCallInvite = async (input) => {
    await ensureActiveMember(input.conversationId, input.callerId);
    if (input.targetUserId) {
        await ensureActiveMember(input.conversationId, input.targetUserId);
    }
    const createdAt = new Date();
    await prisma_1.prisma.call.upsert({
        where: { id: input.callId },
        update: {
            type: input.callType,
            status: client_1.CallStatus.RINGING,
            metadata: {
                targetUserId: input.targetUserId ?? null
            }
        },
        create: {
            id: input.callId,
            conversationId: input.conversationId,
            callerId: input.callerId,
            type: input.callType,
            status: client_1.CallStatus.RINGING,
            metadata: {
                targetUserId: input.targetUserId ?? null
            }
        }
    });
    await prisma_1.prisma.callParticipant.upsert({
        where: {
            callId_userId: {
                callId: input.callId,
                userId: input.callerId
            }
        },
        create: {
            callId: input.callId,
            userId: input.callerId,
            joinedAt: createdAt
        },
        update: {
            joinedAt: createdAt,
            leftAt: null
        }
    });
    if (input.targetUserId) {
        await prisma_1.prisma.callParticipant.upsert({
            where: {
                callId_userId: {
                    callId: input.callId,
                    userId: input.targetUserId
                }
            },
            create: {
                callId: input.callId,
                userId: input.targetUserId
            },
            update: {
                leftAt: null
            }
        });
    }
};
exports.createCallInvite = createCallInvite;
const markCallAnswered = async (input) => {
    await ensureActiveMember(input.conversationId, input.userId);
    const now = new Date();
    await prisma_1.prisma.call.update({
        where: { id: input.callId },
        data: {
            status: client_1.CallStatus.ONGOING,
            startedAt: now,
            endedAt: null
        }
    });
    await prisma_1.prisma.callParticipant.upsert({
        where: {
            callId_userId: {
                callId: input.callId,
                userId: input.userId
            }
        },
        create: {
            callId: input.callId,
            userId: input.userId,
            joinedAt: now
        },
        update: {
            joinedAt: now,
            leftAt: null
        }
    });
};
exports.markCallAnswered = markCallAnswered;
const completeCall = async (input) => {
    await ensureActiveMember(input.conversationId, input.userId);
    const now = new Date();
    const call = await prisma_1.prisma.call.findUnique({
        where: { id: input.callId },
        select: { startedAt: true }
    });
    const durationSec = call?.startedAt
        ? Math.max(0, Math.floor((now.getTime() - call.startedAt.getTime()) / 1000))
        : 0;
    await prisma_1.prisma.call.update({
        where: { id: input.callId },
        data: {
            status: input.status,
            endedAt: now,
            durationSec
        }
    });
    await prisma_1.prisma.callParticipant.updateMany({
        where: {
            callId: input.callId
        },
        data: {
            leftAt: now
        }
    });
};
const markCallRejected = async (input) => {
    await completeCall({
        ...input,
        status: client_1.CallStatus.REJECTED
    });
};
exports.markCallRejected = markCallRejected;
const markCallEnded = async (input) => {
    await completeCall({
        ...input,
        status: client_1.CallStatus.ENDED
    });
};
exports.markCallEnded = markCallEnded;
const markCallCanceled = async (input) => {
    await completeCall({
        ...input,
        status: client_1.CallStatus.CANCELED
    });
};
exports.markCallCanceled = markCallCanceled;
