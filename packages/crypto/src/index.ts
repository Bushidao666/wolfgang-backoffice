import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type SecretEnvelopeVersion = "v1";

export type SecretKeyring = {
  current: string;
  previous?: string;
};

function sha256(raw: string): Buffer {
  return createHash("sha256").update(raw).digest();
}

export function loadKeyringFromEnv(env: NodeJS.ProcessEnv = process.env): SecretKeyring {
  const current = (env.APP_ENCRYPTION_KEY_CURRENT ?? env.APP_ENCRYPTION_KEY ?? "").trim();
  const previous = (env.APP_ENCRYPTION_KEY_PREVIOUS ?? "").trim();
  if (!current) {
    throw new Error("APP_ENCRYPTION_KEY_CURRENT (or APP_ENCRYPTION_KEY) is required");
  }
  return { current, previous: previous || undefined };
}

export function encryptV1(plaintext: string, keyring: SecretKeyring = loadKeyringFromEnv()): string {
  const key = sha256(keyring.current);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

function tryDecryptWithKey(rawKey: string, ivB64: string, tagB64: string, dataB64: string): string {
  const key = sha256(rawKey);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function decryptV1(encrypted: string, keyring?: SecretKeyring): string {
  if (!encrypted.startsWith("v1:")) return encrypted;
  const resolvedKeyring = keyring ?? loadKeyringFromEnv();
  const [, ivB64, tagB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted secret format");

  try {
    return tryDecryptWithKey(resolvedKeyring.current, ivB64, tagB64, dataB64);
  } catch (err) {
    if (!resolvedKeyring.previous) throw err;
    return tryDecryptWithKey(resolvedKeyring.previous, ivB64, tagB64, dataB64);
  }
}

export function encryptJson(payload: Record<string, unknown>, keyring: SecretKeyring = loadKeyringFromEnv()): string {
  return encryptV1(JSON.stringify(payload), keyring);
}

export function decryptJson(encrypted: string, keyring?: SecretKeyring): Record<string, unknown> {
  const raw = decryptV1(encrypted, keyring);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
