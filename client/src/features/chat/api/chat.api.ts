import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";

export interface ConversationItem {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  avatarUrl: string | null;
  counterpartUserId?: string | null;
  memberCount?: number;
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

export interface GroupMemberItem {
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email: string;
  };
}

interface GroupConversationResponse {
  id: string;
  type: "GROUP";
  title: string;
  avatarUrl: string | null;
  memberCount: number;
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
  },

  async createGroup(name: string, memberUserIds: string[], description?: string): Promise<GroupConversationResponse> {
    const { data } = await apiClient.post<ApiResponse<GroupConversationResponse>>("/conversations/group", {
      name,
      memberUserIds,
      description
    });

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  },

  async getGroupMembers(conversationId: string): Promise<GroupMemberItem[]> {
    const { data } = await apiClient.get<ApiResponse<GroupMemberItem[]>>(`/conversations/${conversationId}/members`);

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  },

  async addGroupMembers(conversationId: string, memberUserIds: string[]): Promise<{ addedUserIds: string[]; members: GroupMemberItem[] }> {
    const { data } = await apiClient.post<ApiResponse<{ addedUserIds: string[]; members: GroupMemberItem[] }>>(
      `/conversations/${conversationId}/members`,
      { memberUserIds }
    );

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  },

  async removeGroupMember(conversationId: string, userId: string): Promise<{ removedUserId: string; action: "removed" | "left"; members: GroupMemberItem[] }> {
    const { data } = await apiClient.delete<ApiResponse<{ removedUserId: string; action: "removed" | "left"; members: GroupMemberItem[] }>>(
      `/conversations/${conversationId}/members/${userId}`
    );

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  }
};
