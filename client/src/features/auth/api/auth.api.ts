import axios from "axios";
import { apiClient, resolveApiBaseUrl } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginPayload {
  email: string;
  password: string;
  deviceName?: string;
  platform: "WEB" | "IOS" | "ANDROID" | "DESKTOP";
}

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

interface AuthData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  deviceId?: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthData> {
    const { data } = await apiClient.post<ApiResponse<AuthData>>("/auth/login", payload);
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<void> {
    const { data } = await apiClient.post<ApiResponse<{ user: AuthUser }>>("/auth/register", payload);
    if (!data.success) {
      throw new Error(data.message);
    }
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>("/auth/me");
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  async getUserProfile(userId: string): Promise<AuthUser> {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>(`/auth/users/${userId}`);
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  async updateProfile(payload: { fullName?: string; bio?: string; avatarUrl?: string; coverUrl?: string }): Promise<AuthUser> {
    const { data } = await apiClient.patch<ApiResponse<AuthUser>>("/auth/profile", payload);
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  async refresh(): Promise<AuthData> {
    const baseURL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
    const { data } = await axios.post<ApiResponse<AuthData>>(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 15_000 }
    );
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  }
};
