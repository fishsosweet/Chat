import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/login-page";
import { RegisterPage } from "@/features/auth/pages/register-page";
import { ChatPage } from "@/features/chat/pages/chat-page";
import { authStore } from "@/features/auth/store/auth.store";

function AuthGuard() {
  const tokens = authStore((state) => state.tokens);
  const hydrated = authStore((state) => state.hydrated);

  if (!hydrated) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading session...</div>;
  }

  if (!tokens?.accessToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function GuestGuard() {
  const tokens = authStore((state) => state.tokens);
  const hydrated = authStore((state) => state.hydrated);

  if (!hydrated) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading session...</div>;
  }

  if (tokens?.accessToken) {
    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
}

export const appRouter = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [
      { path: "/", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> }
    ]
  },
  {
    element: <AuthGuard />,
    children: [{ path: "/chat", element: <ChatPage /> }]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);
