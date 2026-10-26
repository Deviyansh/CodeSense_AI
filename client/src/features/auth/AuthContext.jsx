import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const data = await api.auth.me();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await api.auth.register({ name, email, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
