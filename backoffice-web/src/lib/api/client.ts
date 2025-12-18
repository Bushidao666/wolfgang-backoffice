import { getSessionTokens, isJwtExpired, setSessionTokens } from "@/lib/auth/session";
import { resolveApiUrl } from "@/lib/runtime-config";
import { normalizeBaseUrl } from "@/lib/url";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; retry?: boolean; baseUrl?: string } = {},
): Promise<T> {
  const rawBaseUrl = options.baseUrl ?? (await resolveApiUrl());
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers ?? {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  }

  if (!options.skipAuth) {
    const session = getSessionTokens();
    if (!session?.accessToken) {
      throw new ApiError("Not authenticated", 401);
    }

    if (isJwtExpired(session.accessToken) && session.refreshToken) {
      const refreshed = await apiFetch<{ access_token: string; refresh_token: string }>(
        "/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refresh_token: session.refreshToken }),
          skipAuth: true,
        },
      );
      setSessionTokens({ accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token });
    }

    const current = getSessionTokens();
    if (current?.accessToken) {
      headers.set("Authorization", `Bearer ${current.accessToken}`);
    }
  }

  const res = await fetch(url, { ...options, headers });
  if (res.ok) {
    return (await parseJsonSafe(res)) as T;
  }

  const payload = await parseJsonSafe(res);

  if (res.status === 401 && !options.retry && !options.skipAuth) {
    const session = getSessionTokens();
    if (session?.refreshToken) {
      const refreshed = await apiFetch<{ access_token: string; refresh_token: string }>(
        "/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refresh_token: session.refreshToken }),
          skipAuth: true,
          retry: true,
        },
      );
      setSessionTokens({ accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token });
      return apiFetch<T>(path, { ...options, headers: options.headers, retry: true });
    }
  }

  const message = typeof payload?.message === "string" ? payload.message : `Request failed (${res.status})`;
  throw new ApiError(message, res.status, payload);
}
