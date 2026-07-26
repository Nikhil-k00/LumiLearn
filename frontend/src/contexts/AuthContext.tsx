"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "@/lib/api";

interface AuthUser {
  id: string;
  name: string;
  role: "student" | "parent";
  avatarId?: string;
  xp?: number;
  coins?: number;
  level?: number;
  streak?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (credentials: Record<string, string>) => Promise<void>;
  logout: () => void;
  registerStudent: (data: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from localStorage — verify the token is still valid with the server
  useEffect(() => {
    const saved = localStorage.getItem("dyslex_token");
    const savedUser = localStorage.getItem("dyslex_user");
    if (saved && savedUser) {
      // Optimistically restore state so the UI doesn't flash, then confirm with server
      setToken(saved);
      setUser(JSON.parse(savedUser));
      // B7 — verify token hasn't expired; clear session silently if it has
      api.get("/api/auth/me").catch(() => {
        localStorage.removeItem("dyslex_token");
        localStorage.removeItem("dyslex_user");
        setToken(null);
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const persist = (tok: string, u: AuthUser) => {
    localStorage.setItem("dyslex_token", tok);
    localStorage.setItem("dyslex_user", JSON.stringify(u));
    setToken(tok);
    setUser(u);
  };

  const login = useCallback(async (credentials: Record<string, string>) => {
    const { data } = await api.post("/api/auth/login", credentials);
    const u = data.student;
    persist(data.token, {
      id: u.id, name: u.name, role: "student",
      avatarId: u.avatarId, xp: u.xp, coins: u.coins, level: u.level, streak: u.streak,
    });
  }, []);

  const registerStudent = useCallback(async (data: Record<string, unknown>) => {
    const { data: res } = await api.post("/api/auth/student/register", data);
    persist(res.token, {
      id: res.student.id, name: res.student.name, role: "student",
      avatarId: res.student.avatarId, xp: res.student.xp,
      coins: res.student.coins, level: res.student.level, streak: res.student.streak,
    });
  }, []);



  const logout = useCallback(() => {
    localStorage.removeItem("dyslex_token");
    localStorage.removeItem("dyslex_user");
    setUser(null); setToken(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, registerStudent }}>
      {children}
    </AuthContext.Provider>
  );
}
