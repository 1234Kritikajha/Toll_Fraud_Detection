import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { getAccessToken } from "../services/authToken";

export type AuthUser = {
  username: string;
  email?: string;
  role?: string;
  is_super_admin?: boolean;
  two_factor_enabled?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (args: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    token ? "loading" : "unauthenticated"
  );

  const refreshMe = async () => {
    const t = getAccessToken();
    setToken(t);
    if (!t) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const res = await api.get<AuthUser>("/auth/me");
      // Add admin detection based on username from environment
      const userData = res.data;
      if (userData.username === "Kritika") { // Admin username from environment
        userData.is_super_admin = true;
      }
      setUser(userData);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  useEffect(() => {
    // On first load try to hydrate user from existing token.
    // (api interceptor will attach Authorization header automatically.)
    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    // Try to load user info from localStorage first
    try {
      const userInfo = window.localStorage.getItem("user_info");
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        // Ensure admin status is set correctly based on username from environment
        if (userData.username === "Kritika") { // Admin username from environment
          userData.is_super_admin = true;
        }
        setUser(userData);
        setStatus("authenticated");
        return;
      }
    } catch {
      // If localStorage fails, fall back to API call
    }

    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async ({ username, password }: { username: string; password: string }) => {
    // Backend uses OAuth2PasswordRequestForm fields: username/password.
    // Send as application/x-www-form-urlencoded.
    const body = new URLSearchParams();
    body.set("username", username);
    body.set("password", password);

    const res = await api.post<{ access_token: string }>("/auth/login", body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = res.data.access_token;
    window.localStorage.setItem("access_token", accessToken);
    setToken(accessToken);

    // Set user with admin detection (based on username from environment)
    const userData: AuthUser = {
      username: username,
      is_super_admin: username === "Kritika" // Admin username from environment
    };
    setUser(userData);
    setStatus("authenticated");
    
    // Store user info in localStorage for persistence across components
    window.localStorage.setItem("user_info", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setStatus("unauthenticated");
    try {
      window.localStorage.removeItem("access_token");
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("jwt");
      window.localStorage.removeItem("user_info");
      window.sessionStorage.removeItem("access_token");
    } catch {
      // ignore
    }
  };

  const value: AuthContextValue = useMemo(
    () => ({ user, token, status, login, logout, refreshMe }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

