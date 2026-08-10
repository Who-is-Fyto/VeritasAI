import React, { createContext, useContext, useState, useEffect } from "react";
import { veritasAPI } from "../services/api";

interface User {
  id: string;
  email: string;
  name: string;
  joined_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (credentials: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initialise auth state from localStorage
    const savedToken = localStorage.getItem("veritas_token");
    const savedUser = localStorage.getItem("veritas_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
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

  const login = async (credentials: any) => {
    setLoading(true);
    if (import.meta.env.VITE_USE_MOCK_API !== "false") {
      const mockUser = {
        id: "mock-user-123",
        email: credentials.email,
        name: credentials.email.split("@")[0],
        joined_at: new Date().toISOString()
      };
      setToken("mock-token-abc");
      setUser(mockUser);
      localStorage.setItem("veritas_token", "mock-token-abc");
      localStorage.setItem("veritas_user", JSON.stringify(mockUser));
      setLoading(false);
      return;
    }

    try {
      const data = await veritasAPI.login(credentials);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("veritas_token", data.access_token);
      localStorage.setItem("veritas_user", JSON.stringify(data.user));
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: any) => {
    setLoading(true);
    if (import.meta.env.VITE_USE_MOCK_API !== "false") {
      const mockUser = {
        id: "mock-user-123",
        email: payload.email,
        name: payload.name,
        joined_at: new Date().toISOString()
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
        login,
        register,
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
