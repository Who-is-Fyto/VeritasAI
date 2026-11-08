import React from "react";
import { createBrowserRouter, Navigate, useLocation, useRouteError } from "react-router";
import { ShieldAlert, RotateCcw, ArrowLeft } from "lucide-react";
import { Root } from "./components/Root";
import { Home } from "./components/Home";
import { Verify } from "./components/Verify";
import { Results } from "./components/Results";
import { Profile } from "./components/Profile";
import { AdminDashboard } from "./components/AdminDashboard";
import { PresentationDeck } from "./components/PresentationDeck";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { NotFound } from "./components/NotFound";
import { useAuth } from "../context/AuthContext";

// ── Institutional Error Boundary ─────────────────────────────────────────
function RouteErrorBoundary() {
  const error: any = useRouteError();
  const errorMessage = error?.statusText || error?.message || "An unexpected error occurred.";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Application View Error</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          The application encountered an issue while rendering this view. You can reload or return to the verification console.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left mb-6 overflow-x-auto">
          <p className="text-[11px] font-mono text-rose-700 break-words">{errorMessage}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload View</span>
          </button>
          <a
            href="/verify"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>New Verification</span>
          </a>
        </div>
      </div>
    </div>
  );
}

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
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, Component: Home },
      { path: "presentation", Component: PresentationDeck },
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


