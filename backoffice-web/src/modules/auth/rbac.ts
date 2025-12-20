export type JwtPayload = {
  exp?: number;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function base64UrlDecode(input: string): string | null {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  try {
    if (typeof atob === "function") return atob(padded);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = (globalThis as any).Buffer;
    return buf ? buf.from(padded, "base64").toString("utf8") : null;
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const decoded = base64UrlDecode(parts[1] ?? "");
  if (!decoded) return null;

  try {
    const json = JSON.parse(decoded) as unknown;
    return json && typeof json === "object" ? (json as JwtPayload) : null;
  } catch {
    return null;
  }
}

export function getJwtRole(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const fromMeta = payload.app_metadata?.["role"] ?? payload.user_metadata?.["role"];
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta;

  if (typeof payload.role === "string" && payload.role.trim()) return payload.role;
  return null;
}

export function isHoldingRole(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "backoffice_admin" || role === "ai_supervisor";
}

