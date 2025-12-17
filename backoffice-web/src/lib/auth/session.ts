export const SESSION_COOKIE_ACCESS = "bo_access_token";
export const SESSION_COOKIE_REFRESH = "bo_refresh_token";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const encodedName = encodeURIComponent(name) + "=";
  const parts = document.cookie.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(encodedName));
  if (!match) return null;
  return decodeURIComponent(match.slice(encodedName.length));
}

export function getSessionTokens(): SessionTokens | null {
  if (typeof document === "undefined") return null;
  const accessToken = getCookie(SESSION_COOKIE_ACCESS);
  const refreshToken = getCookie(SESSION_COOKIE_REFRESH);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function setSessionTokens(tokens: SessionTokens) {
  setCookie(SESSION_COOKIE_ACCESS, tokens.accessToken);
  setCookie(SESSION_COOKIE_REFRESH, tokens.refreshToken);
}

export function clearSessionTokens() {
  deleteCookie(SESSION_COOKIE_ACCESS);
  deleteCookie(SESSION_COOKIE_REFRESH);
}

export function decodeJwtExp(token: string): number | null {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, leewaySeconds = 30): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + leewaySeconds;
}

