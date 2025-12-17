import { apiFetch } from "@/lib/api/client";
import { clearSessionTokens, setSessionTokens } from "@/lib/auth/session";

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
};

export async function login(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });

  setSessionTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
  return data;
}

export async function refresh(refreshToken: string) {
  const data = await apiFetch<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    skipAuth: true,
  });
  setSessionTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
  return data;
}

export async function logout() {
  clearSessionTokens();
  await apiFetch("/auth/logout", { method: "POST", skipAuth: true }).catch(() => undefined);
}

export async function me() {
  return apiFetch<{ sub: string; email?: string; role: string; company_id?: string }>("/auth/me");
}

export async function forgotPassword(email: string) {
  return apiFetch<{ ok: true }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

export async function resetPassword(accessToken: string, newPassword: string) {
  return apiFetch<{ ok: true }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken, new_password: newPassword }),
    skipAuth: true,
  });
}
