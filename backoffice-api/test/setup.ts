import fs from "fs";
import path from "path";

import { closePostgresPool } from "./utils/postgres";

function loadDotEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

process.env.NODE_ENV = "test";
process.env.SERVICE_NAME = "backoffice-api";
process.env.PROMETHEUS_ENABLED = "false";
process.env.OTEL_TRACING_ENABLED = "false";
process.env.DISABLE_WORKERS = "true";

// Ensure we can encrypt/decrypt in marketing endpoints during tests.
process.env.APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY ?? "test-encryption-key";

// Load repo root .env for local Supabase keys when available.
const repoRoot = path.resolve(__dirname, "../..");
loadDotEnvFile(path.join(repoRoot, ".env"));

// Integration tests run outside Docker by default.
process.env.SUPABASE_URL = process.env.SUPABASE_URL?.replace("host.docker.internal", "127.0.0.1") ?? "http://127.0.0.1:54321";
process.env.SUPABASE_DB_URL =
  process.env.SUPABASE_DB_URL?.replace("host.docker.internal", "127.0.0.1") ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

beforeAll(async () => {
  const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(
      `Supabase local not reachable at ${url}. Run \`npx supabase start --workdir .\` (repo root) before integration tests.`,
    );
  }
});

afterAll(async () => {
  await closePostgresPool().catch(() => undefined);
});
