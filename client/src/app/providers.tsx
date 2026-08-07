import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/query-client";
import { appRouter } from "@/app/router";
import { authStore } from "@/features/auth/store/auth.store";
import { connectSocket } from "@/lib/socket-client";
import { themeStore } from "@/features/shared/theme.store";

export function AppProviders() {
  const tokens = authStore((state) => state.tokens);
  const syncMe = authStore((state) => state.syncMe);

  useEffect(() => {
    themeStore.getState().applyTheme();
  }, []);

  useEffect(() => {
    if (!tokens?.accessToken) {
      return;
    }

    connectSocket(tokens.accessToken);
    void syncMe();
  }, [syncMe, tokens?.accessToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={appRouter} />
    </QueryClientProvider>
  );
}
