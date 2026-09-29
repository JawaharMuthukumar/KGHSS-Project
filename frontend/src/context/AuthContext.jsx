import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler } from "../lib/apiClient";

const AuthContext = createContext(null);

const TOKEN_KEY = "ghss_token";
const USER_KEY = "ghss_user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const me = await api.get("/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async ({ username, password, classCode }) => {
    const data = await api.post("/auth/login", {
      username,
      password,
      class_code: classCode || undefined,
    });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
