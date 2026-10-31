import React, { createContext, useContext, useState, useEffect } from "react";
import { veritasAPI } from "../services/api";
import { resolveAffiliation } from "../utils/affiliation";
import { AccountTier, resolveTier } from "../utils/tierLimits";

export interface User {
  id: string;
  email: string;
  name: string;
  joined_at: string;
  role?: string;
  institution?: string;
  student_id?: string;
  account_type?: "academic" | "enterprise" | "base" | "pro" | "free";
  tier?: AccountTier;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  tier: AccountTier;
  login: (credentials: any) => Promise<{ requiresOtp?: boolean; email?: string; devOtp?: string | null }>;
  loginVerifyOtp: (email: string, otp: string) => Promise<void>;
  signupRequestOtp: (payload: any) => Promise<{ status: string; message: string; email: string; dev_otp?: string | null }>;
  signupVerifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string, purpose: "signup" | "login") => Promise<{ status: string; message: string; dev_otp?: string | null }>;
  register: (payload: any) => Promise<void>;
  updateProfile: (payload: any) => Promise<void>;
  changeTier: (tier: AccountTier) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentTier = resolveTier(user);

  useEffect(() => {
    // 1. Initialise auth state from localStorage
    const savedToken = localStorage.getItem("veritas_token");
    const savedUser = localStorage.getItem("veritas_user");

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
      
      if (import.meta.env.VITE_USE_MOCK_API !== "false") {
        setLoading(false);
        return;
      }

      // Verification call to keep profile in sync
      veritasAPI.getMe()
        .then((profile) => {
          setUser(profile);
          localStorage.setItem("veritas_user", JSON.stringify(profile));
        })
        .catch(() => {
          // If token expired, force logout
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: any): Promise<{ requiresOtp?: boolean; email?: string; devOtp?: string | null }> => {
    setLoading(true);
    if (import.meta.env.VITE_USE_MOCK_API !== "false") {
      const email = (credentials.email || "").trim().toLowerCase();
      const isSuperAdmin = email.includes("superadmin") || email === "admin@veritas.ai";
      const aff = resolveAffiliation(credentials.email);
      const tier: AccountTier = isSuperAdmin
        ? "superadmin"
        : aff.accountType === "academic"
        ? "academic"
        : aff.accountType === "enterprise"
        ? "pro"
        : "free";

      const mockUser: User = {
        id: isSuperAdmin ? "admin-1" : "mock-user-123",
        email: credentials.email,
        name: isSuperAdmin ? "VeritasAI Super Administrator" : (credentials.name || credentials.email.split("@")[0]),
        joined_at: new Date().toISOString(),
        institution: isSuperAdmin ? "VeritasAI Governance Directorate" : aff.institution,
        role: isSuperAdmin ? "superadmin" : aff.role,
        student_id: aff.studentId || undefined,
        account_type: isSuperAdmin ? "enterprise" : aff.accountType,
        tier,
      };
      setToken("mock-token-abc");
      setUser(mockUser);
      localStorage.setItem("veritas_token", "mock-token-abc");
      localStorage.setItem("veritas_user", JSON.stringify(mockUser));
      setLoading(false);
      return { requiresOtp: false };
    }

    try {
      const data = await veritasAPI.login(credentials);
      if (data.requires_otp) {
        return {
          requiresOtp: true,
          email: data.email || credentials.email,
          devOtp: data.dev_otp
        };
      }
      setToken(data.access_token);
      setUser(data.user);
      if (data.access_token) {
        localStorage.setItem("veritas_token", data.access_token);
      }
      if (data.user) {
        localStorage.setItem("veritas_user", JSON.stringify(data.user));
      }
      return { requiresOtp: false };
    } finally {
      setLoading(false);
    }
  };

  const loginVerifyOtp = async (email: string, otp: string) => {
    setLoading(true);
    try {
      const data = await veritasAPI.loginVerifyOtp(email, otp);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("veritas_token", data.access_token);
      localStorage.setItem("veritas_user", JSON.stringify(data.user));
    } finally {
      setLoading(false);
    }
  };

  const signupRequestOtp = async (payload: any) => {
    return await veritasAPI.signupRequestOtp(payload);
  };

  const signupVerifyOtp = async (email: string, otp: string) => {
    setLoading(true);
    try {
      const data = await veritasAPI.signupVerifyOtp(email, otp);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("veritas_token", data.access_token);
      localStorage.setItem("veritas_user", JSON.stringify(data.user));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email: string, purpose: "signup" | "login") => {
    return await veritasAPI.resendOtp(email, purpose);
  };

  const register = async (payload: any) => {
    setLoading(true);
    if (import.meta.env.VITE_USE_MOCK_API !== "false") {
      const email = (payload.email || "").trim().toLowerCase();
      const isSuperAdmin = email.includes("superadmin") || email === "admin@veritas.ai";
      const aff = resolveAffiliation(payload.email);
      const tier: AccountTier = isSuperAdmin
        ? "superadmin"
        : aff.accountType === "academic"
        ? "academic"
        : aff.accountType === "enterprise"
        ? "pro"
        : "free";

      const mockUser: User = {
        id: isSuperAdmin ? "admin-1" : "mock-user-123",
        email: payload.email,
        name: isSuperAdmin ? "VeritasAI Super Administrator" : payload.name,
        joined_at: new Date().toISOString(),
        institution: isSuperAdmin ? "VeritasAI Governance Directorate" : (payload.institution || aff.institution),
        role: isSuperAdmin ? "superadmin" : (payload.role || aff.role),
        student_id: payload.student_id || aff.studentId || undefined,
        account_type: isSuperAdmin ? "enterprise" : aff.accountType,
        tier,
      };
      setToken("mock-token-abc");
      setUser(mockUser);
      localStorage.setItem("veritas_token", "mock-token-abc");
      localStorage.setItem("veritas_user", JSON.stringify(mockUser));
      setLoading(false);
      return;
    }

    try {
      const data = await veritasAPI.register(payload);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("veritas_token", data.access_token);
      localStorage.setItem("veritas_user", JSON.stringify(data.user));
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (payload: any) => {
    if (import.meta.env.VITE_USE_MOCK_API !== "false") {
      const updated: User = {
        ...(user || {
          id: "mock-user-123",
          email: "user@example.com",
          name: "User",
          joined_at: new Date().toISOString(),
        }),
        ...payload,
      };
      setUser(updated);
      localStorage.setItem("veritas_user", JSON.stringify(updated));
      return;
    }

    const updatedUser = await veritasAPI.updateProfile(payload);
    setUser(updatedUser);
    localStorage.setItem("veritas_user", JSON.stringify(updatedUser));
  };

  const changeTier = async (newTier: AccountTier) => {
    if (import.meta.env.VITE_USE_MOCK_API !== "false") {
      const updated: User = {
        ...(user || {
          id: "mock-user-123",
          email: "user@example.com",
          name: "User",
          joined_at: new Date().toISOString(),
        }),
        tier: newTier,
        account_type: newTier === "academic" ? "academic" : newTier === "pro" ? "enterprise" : "base",
      };
      setUser(updated);
      localStorage.setItem("veritas_user", JSON.stringify(updated));
      return;
    }

    const updatedUser = await veritasAPI.updateTier(newTier);
    setUser(updatedUser);
    localStorage.setItem("veritas_user", JSON.stringify(updatedUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("veritas_token");
    localStorage.removeItem("veritas_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggedIn: !!token,
        tier: currentTier,
        login,
        loginVerifyOtp,
        signupRequestOtp,
        signupVerifyOtp,
        resendOtp,
        register,
        updateProfile,
        changeTier,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
