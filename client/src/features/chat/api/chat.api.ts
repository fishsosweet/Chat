import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";

export interface ConversationItem {
  id: string;
  title: string;
  avatarUrl: string | null;
  counterpartUserId?: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ConversationPage {
  items: ConversationItem[];
  nextCursor: string | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  type: string;
  content: string | null;
  state: string;
  replyToMessageId?: string | null;
  createdAt: string;
}

interface ConversationMessagesPage {
  items: ConversationMessage[];
  nextCursor: string | null;
}

interface DirectConversationResponse {
  id: string;
  title: string;
  avatarUrl: string | null;
  lastMessageAt: string | null;
}

export const chatApi = {
  async getConversations(cursor?: string): Promise<ConversationPage> {
    const { data } = await apiClient.get<ApiResponse<ConversationPage>>("/conversations", {
      params: { cursor, limit: 30 }
    });

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  },

  async getConversationMessages(conversationId: string, cursor?: string): Promise<ConversationMessagesPage> {
    const { data } = await apiClient.get<ApiResponse<ConversationMessagesPage>>(
      `/conversations/${conversationId}/messages`,
      {
        params: { cursor, limit: 40 }
      }
    );

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  },

  async createDirectConversation(targetUserId: string): Promise<DirectConversationResponse> {
    const { data } = await apiClient.post<ApiResponse<DirectConversationResponse>>("/conversations/direct", {
      targetUserId
    });

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  }
};
