"use client";

import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, logout, setUser, reset, restoreSession } =
    useAuthStore();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login(email, password);
    },
    [login]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    reset();
  }, [logout, reset]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
    setUser,
  };
}
