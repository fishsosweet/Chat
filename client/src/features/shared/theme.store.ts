import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  applyTheme: () => void;
}

export const themeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      toggleTheme() {
        const nextMode = get().mode === "light" ? "dark" : "light";
        set({ mode: nextMode });
        document.documentElement.dataset.theme = nextMode;
      },
      applyTheme() {
        document.documentElement.dataset.theme = get().mode;
      }
    }),
    { name: "chat-theme-store" }
  )
);
