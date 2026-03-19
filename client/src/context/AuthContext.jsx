import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [pendingEmail, setPendingEmail] = useState(() => localStorage.getItem("pendingEmail"));

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let isActive = true;

    api.getMe()
      .then((data) => {
        if (isActive) setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem("token");
        if (isActive) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => { isActive = false; };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    // login might throw with needsVerification
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api.register(name, email, password);
    // Now register returns { message, email } — no token yet
    localStorage.setItem("pendingEmail", email);
    setPendingEmail(email);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("pendingEmail");
    setToken(null);
    setUser(null);
    setPendingEmail(null);
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
        email: pendingEmail,
        setToken,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
