"use client";

import * as React from "react";

import { login as loginApi, logout as logoutApi, me as meApi } from "@/lib/api/auth";
import { clearSessionTokens } from "@/lib/auth/session";

export function useAuth() {
  const [user, setUser] = React.useState<{ sub: string; email?: string; role: string; company_id?: string } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshMe = React.useCallback(async () => {
    try {
      const data = await meApi();
      setUser({ sub: data.sub, email: data.email, role: data.role, company_id: data.company_id });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = React.useCallback(async (email: string, password: string) => {
    await loginApi(email, password);
    await refreshMe();
  }, [refreshMe]);

  const logout = React.useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      clearSessionTokens();
      setUser(null);
    }
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshMe,
  };
}
