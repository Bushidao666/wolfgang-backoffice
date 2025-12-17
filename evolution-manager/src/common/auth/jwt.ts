import { createHmac, timingSafeEqual } from "crypto";

type JwtPayload = {
  sub: string;
  email?: string;
  exp: number;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function verifyHs256Jwt(token: string, secret: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, signatureB64] = parts;
  const headerRaw = base64UrlDecode(headerB64).toString("utf8");
  const payloadRaw = base64UrlDecode(payloadB64).toString("utf8");

  const header = JSON.parse(headerRaw) as { alg?: string; typ?: string };
  if (header.alg !== "HS256") throw new Error("Unsupported JWT alg");

  const expected = createHmac("sha256", secret).update(`${headerB64}.${payloadB64}`).digest();
  const actual = base64UrlDecode(signatureB64);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid JWT signature");
  }

  const payload = JSON.parse(payloadRaw) as JwtPayload;
  if (typeof payload.exp !== "number") throw new Error("Missing exp");

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error("JWT expired");
  return payload;
}

