import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { tokens } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokens.access));

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me/");
      setUser(data);
    } catch {
      tokens.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tokens.access) loadMe();
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login/", { email, password });
    tokens.set(data);
    await loadMe();
  };

  const register = async (payload) => {
    await api.post("/auth/register/", payload);
    await login(payload.email, payload.password);
  };

  const logout = () => {
    tokens.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, reload: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
