import { MessageType } from "@prisma/client";

interface SessionDescriptionData {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp: string;
}

interface IceCandidateData {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
}

export interface SocketAuthContext {
  userId: string;
  sessionId: string;
  deviceId?: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface SendMessagePayload {
  conversationId: string;
  type?: MessageType;
  content?: string;
  clientMessageId?: string;
  replyToMessageId?: string;
}

export interface MessageSyncPayload {
  conversationId: string;
  since?: string;
  limit?: number;
}

export interface SeenPayload {
  conversationId: string;
  messageId: string;
}

export interface SignalingPayload {
  conversationId: string;
  targetUserId?: string;
  callId?: string;
  callType?: "VOICE" | "VIDEO";
  data?: {
    sdp?: SessionDescriptionData;
    candidate?: IceCandidateData;
    reason?: string;
  };
}
