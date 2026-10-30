import React from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { Root } from "./components/Root";
import { Home } from "./components/Home";
import { Verify } from "./components/Verify";
import { Results } from "./components/Results";
import { Profile } from "./components/Profile";
import { AdminDashboard } from "./components/AdminDashboard";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { NotFound } from "./components/NotFound";
import { useAuth } from "../context/AuthContext";

// ── Protected Route Guard ───────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50/30 to-white">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

// ── Super Admin Route Guard ─────────────────────────────────────────────
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50/30 to-white">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const isSuperAdmin =
    user?.tier === "superadmin" ||
    user?.role?.toLowerCase() === "superadmin" ||
    user?.role?.toLowerCase() === "admin" ||
    user?.email?.toLowerCase().includes("superadmin@") ||
    user?.email?.toLowerCase() === "admin@veritas.ai";

  if (!isSuperAdmin) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { 
        path: "verify", 
        element: <ProtectedRoute><Verify /></ProtectedRoute> 
      },
      { 
        path: "results/:id", 
        element: <ProtectedRoute><Results /></ProtectedRoute> 
      },
      { 
        path: "profile", 
        element: <ProtectedRoute><Profile /></ProtectedRoute> 
      },
      {
        path: "admin",
        element: <SuperAdminRoute><AdminDashboard /></SuperAdminRoute>
      },
      { path: "*", Component: NotFound },
    ],
  },
]);


