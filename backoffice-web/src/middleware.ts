import { NextResponse, type NextRequest } from "next/server";

import { normalizeBaseUrl } from "@/lib/url";
import { getJwtRole, isHoldingRole } from "@/modules/auth/rbac";

const ACCESS_COOKIE = "bo_access_token";
const REFRESH_COOKIE = "bo_refresh_token";

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
  "/api/health",
  "/api/runtime-config",
]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/assets")) return true;
  return false;
}

function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1];
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

function isExpired(token: string, leewaySeconds = 30) {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + leewaySeconds;
}

async function tryRefresh(req: NextRequest): Promise<{ access_token: string; refresh_token: string } | null> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const apiBaseRaw = process.env.NEXT_PUBLIC_API_URL;
  const apiBase =
    apiBaseRaw ? normalizeBaseUrl(apiBaseRaw) : (process.env.NODE_ENV === "production" ? null : "http://localhost:4000");
  if (!apiBase) return null;
  const res = await fetch(`${apiBase}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!json.access_token || !json.refresh_token) return null;
  return { access_token: json.access_token, refresh_token: json.refresh_token };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    if (pathname === "/login") {
      const token = req.cookies.get(ACCESS_COOKIE)?.value;
      if (token && !isExpired(token)) {
        const role = getJwtRole(token);
        if (!isHoldingRole(role)) {
          const url = req.nextUrl.clone();
          url.pathname = "/unauthorized";
          return NextResponse.redirect(url);
        }
        const url = req.nextUrl.clone();
        url.pathname = "/empresas";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!isExpired(accessToken)) {
    const role = getJwtRole(accessToken);
    if (!isHoldingRole(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      const response = NextResponse.redirect(url);
      response.cookies.set(ACCESS_COOKIE, "", { path: "/", sameSite: "lax", maxAge: 0 });
      response.cookies.set(REFRESH_COOKIE, "", { path: "/", sameSite: "lax", maxAge: 0 });
      return response;
    }
    return NextResponse.next();
  }

  const refreshed = await tryRefresh(req);
  if (!refreshed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const refreshedRole = getJwtRole(refreshed.access_token);
  if (!isHoldingRole(refreshedRole)) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    const response = NextResponse.redirect(url);
    response.cookies.set(ACCESS_COOKIE, "", { path: "/", sameSite: "lax", maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE, "", { path: "/", sameSite: "lax", maxAge: 0 });
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set(ACCESS_COOKIE, refreshed.access_token, { path: "/", sameSite: "lax" });
  response.cookies.set(REFRESH_COOKIE, refreshed.refresh_token, { path: "/", sameSite: "lax" });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
