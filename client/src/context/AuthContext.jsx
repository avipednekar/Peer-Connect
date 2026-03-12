import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(token));

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let isActive = true;

    api.getMe()
      .then((data) => {
        if (isActive) {
          setUser(data.user);
        }
      })
      .catch(() => {
        localStorage.removeItem("token");

        if (isActive) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api.register(name, email, password);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
