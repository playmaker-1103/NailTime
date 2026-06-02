import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken"));
  const [admin, setAdmin] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(Boolean(token));

  useEffect(() => {
    let isMounted = true;

    async function loadAdmin() {
      if (!token) {
        setAdmin(null);
        setCheckingAuth(false);
        return;
      }

      try {
        const data = await api.me();
        if (isMounted) {
          setAdmin(data.admin);
        }
      } catch {
        localStorage.removeItem("adminToken");
        if (isMounted) {
          setToken(null);
          setAdmin(null);
        }
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    }

    loadAdmin();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function login(email, password) {
    const data = await api.login({ email, password });
    localStorage.setItem("adminToken", data.token);
    setToken(data.token);
    setAdmin(data.admin);
  }

  function logout() {
    localStorage.removeItem("adminToken");
    setToken(null);
    setAdmin(null);
  }

  const value = useMemo(
    () => ({ admin, checkingAuth, isAuthenticated: Boolean(token), login, logout, token }),
    [admin, checkingAuth, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

