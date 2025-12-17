/* eslint-disable no-console */
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadDotEnvFile(filePath) {
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

function waitForever() {
  setInterval(() => undefined, 1000);
}

async function waitForOk(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function quoteIdent(name) {
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

async function resetDatabase(dbUrl) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const systemSchemas = new Set([
    "_realtime",
    "_template_base",
    "auth",
    "core",
    "extensions",
    "graphql",
    "graphql_public",
    "information_schema",
    "net",
    "pg_catalog",
    "pg_toast",
    "pgbouncer",
    "public",
    "realtime",
    "storage",
    "supabase_functions",
    "supabase_migrations",
    "vault",
  ]);

  try {
    const schemas = await client.query(`select schema_name from information_schema.schemata`);
    for (const row of schemas.rows) {
      const schemaName = String(row.schema_name);
      if (systemSchemas.has(schemaName)) continue;
      if (schemaName.startsWith("pg_")) continue;
      await client.query(`drop schema if exists ${quoteIdent(schemaName)} cascade`);
    }

    const tables = await client.query(`select tablename from pg_tables where schemaname='core'`);
    const coreTables = tables.rows.map((row) => String(row.tablename)).filter(Boolean);
    if (coreTables.length) {
      const qualified = coreTables.map((t) => `core.${quoteIdent(t)}`).join(", ");
      await client.query(`truncate table ${qualified} restart identity cascade`);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, "../..");
  const webPort = Number(process.env.E2E_WEB_PORT || 3100);
  const apiPort = Number(process.env.E2E_API_PORT || 4100);

  loadDotEnvFile(path.join(repoRoot, ".env"));

  const supabaseUrl = (process.env.SUPABASE_URL || "http://127.0.0.1:54321").replace("host.docker.internal", "127.0.0.1");
  process.env.SUPABASE_URL = supabaseUrl;
  process.env.SUPABASE_DB_URL =
    (process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres").replace(
      "host.docker.internal",
      "127.0.0.1",
    );

  process.env.REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  process.env.NODE_ENV = "test";
  process.env.PROMETHEUS_ENABLED = "false";
  process.env.OTEL_TRACING_ENABLED = "false";
  process.env.DISABLE_WORKERS = "true";
  process.env.APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY || "e2e-encryption-key";
  const corsOrigins = new Set(
    String(process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  corsOrigins.add(`http://localhost:${webPort}`);
  corsOrigins.add(`http://127.0.0.1:${webPort}`);
  process.env.CORS_ORIGIN = Array.from(corsOrigins).join(",");

  try {
    execSync("npx supabase start --workdir . --exclude studio --yes", { cwd: repoRoot, stdio: "inherit" });
    execSync("npx supabase db push --workdir . --local --include-roles --yes", { cwd: repoRoot, stdio: "inherit" });
    await resetDatabase(process.env.SUPABASE_DB_URL);
    execSync("docker compose -f docker-compose.yml up -d redis", { cwd: repoRoot, stdio: "inherit" });
  } catch (err) {
    console.error("Failed to prepare e2e environment:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const api = spawn("npm", ["-w", "@wolfgang/backoffice-api", "run", "start:dev"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(apiPort) },
    stdio: "inherit",
  });

  await waitForOk(`http://127.0.0.1:${apiPort}/health`, 120_000);

  const webEnv = {
    ...process.env,
    // E2E must be deterministic and must not inherit dev `.env` URLs.
    // In this environment, `localhost` may resolve to IPv6-only (::1) while the API binds on IPv4.
    NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  };

  const nextBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
  const web = spawn(nextBin, ["dev", "-p", String(webPort)], {
    cwd: path.join(repoRoot, "backoffice-web"),
    env: webEnv,
    stdio: "inherit",
  });

  const shutdown = () => {
    api.kill("SIGTERM");
    web.kill("SIGTERM");

    setTimeout(() => {
      api.kill("SIGKILL");
      web.kill("SIGKILL");
      process.exit(0);
    }, 10_000).unref();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  api.once("exit", (code) => {
    console.error(`backoffice-api exited (code=${code ?? "null"})`);
    shutdown();
  });
  web.once("exit", (code) => {
    console.error(`backoffice-web exited (code=${code ?? "null"})`);
    shutdown();
  });

  waitForever();
}

main().catch((err) => {
  console.error("E2E env startup failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
