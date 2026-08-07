import { CallStatus, CallType, MemberStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

const ensureActiveMember = async (conversationId: string, userId: string): Promise<void> => {
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

export const createCallInvite = async (input: {
  callId: string;
  conversationId: string;
  callerId: string;
  callType: CallType;
  targetUserId?: string;
}): Promise<void> => {
  await ensureActiveMember(input.conversationId, input.callerId);

  if (input.targetUserId) {
    await ensureActiveMember(input.conversationId, input.targetUserId);
  }

  const createdAt = new Date();

  await prisma.call.upsert({
    where: { id: input.callId },
    update: {
      type: input.callType,
      status: CallStatus.RINGING,
      metadata: {
        targetUserId: input.targetUserId ?? null
      }
    },
    create: {
      id: input.callId,
      conversationId: input.conversationId,
      callerId: input.callerId,
      type: input.callType,
      status: CallStatus.RINGING,
      metadata: {
        targetUserId: input.targetUserId ?? null
      }
    }
  });

  await prisma.callParticipant.upsert({
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
    await prisma.callParticipant.upsert({
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

export const markCallAnswered = async (input: {
  callId: string;
  userId: string;
  conversationId: string;
}): Promise<void> => {
  await ensureActiveMember(input.conversationId, input.userId);

  const now = new Date();

  await prisma.call.update({
    where: { id: input.callId },
    data: {
      status: CallStatus.ONGOING,
      startedAt: now,
      endedAt: null
    }
  });

  await prisma.callParticipant.upsert({
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

const completeCall = async (input: {
  callId: string;
  userId: string;
  conversationId: string;
  status: "REJECTED" | "ENDED" | "CANCELED";
}): Promise<void> => {
  await ensureActiveMember(input.conversationId, input.userId);

  const now = new Date();

  const call = await prisma.call.findUnique({
    where: { id: input.callId },
    select: { startedAt: true }
  });

  const durationSec = call?.startedAt
    ? Math.max(0, Math.floor((now.getTime() - call.startedAt.getTime()) / 1000))
    : 0;

  await prisma.call.update({
    where: { id: input.callId },
    data: {
      status: input.status,
      endedAt: now,
      durationSec
    }
  });

  await prisma.callParticipant.updateMany({
    where: {
      callId: input.callId
    },
    data: {
      leftAt: now
    }
  });
};

export const markCallRejected = async (input: {
  callId: string;
  userId: string;
  conversationId: string;
}): Promise<void> => {
  await completeCall({
    ...input,
    status: CallStatus.REJECTED
  });
};

export const markCallEnded = async (input: {
  callId: string;
  userId: string;
  conversationId: string;
}): Promise<void> => {
  await completeCall({
    ...input,
    status: CallStatus.ENDED
  });
};

export const markCallCanceled = async (input: {
  callId: string;
  userId: string;
  conversationId: string;
}): Promise<void> => {
  await completeCall({
    ...input,
    status: CallStatus.CANCELED
  });
};
