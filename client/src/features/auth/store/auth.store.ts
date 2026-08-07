import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type AuthTokens, type AuthUser } from "@/features/auth/api/auth.api";
import { connectSocket, disconnectSocket } from "@/lib/socket-client";

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  syncMe: () => Promise<void>;
  clearAuthState: () => void;
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),

      async login(payload) {
        const data = await authApi.login({
          ...payload,
          deviceName: "Web Browser",
          platform: "WEB"
        });

        set({
          user: data.user,
          tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken }
        });

        connectSocket(data.accessToken);
      },

      async register(payload) {
        await authApi.register(payload);
      },

      async logout() {
        try {
          await authApi.logout();
        } finally {
          disconnectSocket();
          set({ user: null, tokens: null });
        }
      },

      async refreshSession() {
        const data = await authApi.refresh();
        set({
          user: data.user,
          tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken }
        });
        connectSocket(data.accessToken);
      },

      async syncMe() {
        const user = await authApi.me();
        set({ user });
      },

      clearAuthState() {
        disconnectSocket();
        set({ user: null, tokens: null });
      }
    }),
    {
      name: "chat-auth-store",
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);
