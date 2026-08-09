"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, clearToken, getToken, setToken } from "@/lib/api";
import type { UserDto } from "@tracker/utils";

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(() => !getToken());
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api
      .me()
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) clearToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    router.replace("/");
  }, [router]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.signup(email, password, name);
    setToken(res.token);
    setUser(res.user);
    router.replace("/");
  }, [router]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}