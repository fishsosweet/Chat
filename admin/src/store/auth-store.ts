import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { ApiResponse, AuthUser, LoginData, LoginPayload } from "../types/api";

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

interface AuthState {
  user: AuthUser | null;
  tokens: Tokens | null;
  hydrated: boolean;
  setHydrated: () => void;
  login: (payload: LoginPayload) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  clearAuthState: () => void;
}

const STORAGE_KEY = "chatrealtime_admin_auth";

const readStorage = (): { user: AuthUser | null; tokens: Tokens | null } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { user: null, tokens: null };
    }
    return JSON.parse(raw) as { user: AuthUser | null; tokens: Tokens | null };
  } catch {
    return { user: null, tokens: null };
  }
};

const writeStorage = (user: AuthUser | null, tokens: Tokens | null) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, tokens }));
};

const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const initial = readStorage();

export const authStore = create<AuthState>((set, get) => ({
  user: initial.user,
  tokens: initial.tokens,
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
  login: async (payload) => {
    const response = await apiClient.post<ApiResponse<LoginData>>("/auth/login", payload);
    const tokens = {
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken
    };
    const user = response.data.data.user;
    writeStorage(user, tokens);
    set({ user, tokens });
  },
  refreshSession: async () => {
    const refreshToken = get().tokens?.refreshToken;
    const response = await apiClient.post<ApiResponse<LoginData>>("/auth/refresh", { refreshToken });
    const tokens = {
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken
    };
    const user = response.data.data.user;
    writeStorage(user, tokens);
    set({ user, tokens });
  },
  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Clear local auth state even if server-side logout has already expired.
    }
    clearStorage();
    set({ user: null, tokens: null });
  },
  bootstrap: async () => {
    if (!get().tokens?.accessToken) {
      set({ hydrated: true });
      return;
    }

    try {
      const response = await apiClient.get<ApiResponse<AuthUser>>("/auth/me");
      const user = response.data.data;
      writeStorage(user, get().tokens);
      set({ user });
    } catch {
      clearStorage();
      set({ user: null, tokens: null });
    } finally {
      set({ hydrated: true });
    }
  },
  clearAuthState: () => {
    clearStorage();
    set({ user: null, tokens: null });
  }
}));
