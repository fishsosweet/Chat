import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { authStore } from "../store/auth-store";
import { LoginPage } from "../features/auth/login-page";
import { DashboardPage } from "../features/dashboard/dashboard-page";

function AuthGuard() {
  const tokens = authStore((state) => state.tokens);
  const hydrated = authStore((state) => state.hydrated);

  if (!hydrated) {
    return <div className="center">Loading admin session...</div>;
  }

  if (!tokens?.accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function GuestGuard() {
  const tokens = authStore((state) => state.tokens);
  const hydrated = authStore((state) => state.hydrated);

  if (!hydrated) {
    return <div className="center">Loading admin session...</div>;
  }

  if (tokens?.accessToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export const appRouter = createBrowserRouter([
  {
    element: <AuthGuard />,
    children: [{ path: "/", element: <DashboardPage /> }]
  },
  {
    element: <GuestGuard />,
    children: [{ path: "/login", element: <LoginPage /> }]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);
