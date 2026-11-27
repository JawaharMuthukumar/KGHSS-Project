import { authStorage } from "../lib/authStorage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler } from "../lib/apiClient";
import { LAST_USER_KEY } from "../lib/loginRedirect";

const AuthContext = createContext(null);

const TOKEN_KEY = "ghss_token";
const USER_KEY = "ghss_user";

function readStoredUser() {
  try {
    const raw = authStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Forget the session, remembering whose it was (see lib/loginRedirect). */
function clearSession() {
  const prev = readStoredUser();
  if (prev?.username) authStorage.setItem(LAST_USER_KEY, prev.username);
  authStorage.removeItem(TOKEN_KEY);
  authStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setUser(null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      const token = authStorage.getItem(TOKEN_KEY);
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const me = await api.get("/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          clearSession();
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

  // `role` is the login page being used (admin / teacher / student): the server refuses an account of another role.
  const login = async ({ username, password, classCode, role }) => {
    const data = await api.post("/auth/login", {
      username,
      password,
      class_code: classCode || undefined,
      role: role || undefined,
    });
    authStorage.setItem(TOKEN_KEY, data.access_token);
    authStorage.setItem(USER_KEY, JSON.stringify(data.user));
    authStorage.removeItem(LAST_USER_KEY);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  // Refresh the signed-in user's details (e.g. after changing the default password).
  const updateUser = (next) => {
    authStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  };

  const value = useMemo(() => ({ user, ready, login, logout, updateUser }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
