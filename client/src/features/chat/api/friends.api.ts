import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";

export type FriendStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";

export interface FriendUser {
  id: string;
  fullName: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface FriendSearchItem extends FriendUser {
  friendship: {
    friendId: string;
    status: FriendStatus;
    direction: "incoming" | "outgoing";
  } | null;
}

export interface FriendRequestItem {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendStatus;
  requestedAt: string;
  requester?: FriendUser;
  addressee?: FriendUser;
}

export interface FriendListItem {
  friendId: string;
  acceptedAt: string;
  user: FriendUser;
}

export const friendsApi = {
  async searchUsers(keyword: string, limit = 20): Promise<FriendSearchItem[]> {
    const { data } = await apiClient.get<ApiResponse<FriendSearchItem[]>>("/friends/users", {
      params: { keyword, limit }
    });

    if (!data.success) {
      throw new Error(data.message ?? "Cannot search users");
    }

    return data.data;
  },

  async sendRequest(targetUserId: string): Promise<FriendRequestItem> {
    const { data } = await apiClient.post<ApiResponse<FriendRequestItem>>("/friends/requests", { targetUserId });

    if (!data.success) {
      throw new Error(data.message ?? "Cannot send friend request");
    }

    return data.data;
  },

  async getIncomingRequests(): Promise<FriendRequestItem[]> {
    const { data } = await apiClient.get<ApiResponse<FriendRequestItem[]>>("/friends/requests/incoming");

    if (!data.success) {
      throw new Error(data.message ?? "Cannot load incoming requests");
    }

    return data.data;
  },

  async getOutgoingRequests(): Promise<FriendRequestItem[]> {
    const { data } = await apiClient.get<ApiResponse<FriendRequestItem[]>>("/friends/requests/outgoing");

    if (!data.success) {
      throw new Error(data.message ?? "Cannot load outgoing requests");
    }

    return data.data;
  },

  async acceptRequest(friendId: string): Promise<void> {
    const { data } = await apiClient.post<ApiResponse<unknown>>(`/friends/requests/${friendId}/accept`);

    if (!data.success) {
      throw new Error(data.message ?? "Cannot accept friend request");
    }
  },

  async rejectRequest(friendId: string): Promise<void> {
    const { data } = await apiClient.post<ApiResponse<unknown>>(`/friends/requests/${friendId}/reject`);

    if (!data.success) {
      throw new Error(data.message ?? "Cannot reject friend request");
    }
  },

  async cancelRequest(friendId: string): Promise<void> {
    const { data } = await apiClient.delete<ApiResponse<unknown>>(`/friends/requests/${friendId}`);

    if (!data.success) {
      throw new Error(data.message ?? "Cannot cancel friend request");
    }
  },

  async getFriends(): Promise<FriendListItem[]> {
    const { data } = await apiClient.get<ApiResponse<FriendListItem[]>>("/friends/list");

    if (!data.success) {
      throw new Error(data.message ?? "Cannot load friends");
    }

    return data.data;
  }
};
