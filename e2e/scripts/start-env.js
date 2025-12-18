/* eslint-disable no-console */
const { execSync, spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Client } = require("pg");
const { encryptJson } = require("@wolfgang/crypto");

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function makeEmbeddingVector(input) {
  const vec = new Array(1536).fill(0);
  const hash = crypto.createHash("sha256").update(String(input ?? "")).digest();
  for (let i = 0; i < Math.min(hash.length, vec.length); i++) {
    vec[i] = hash[i] / 255;
  }
  return vec;
}

async function startMockServer({ port }) {
  const store = {
    autentique: new Map(),
    telegram: new Map(),
    evolution: new Map(),
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      const pathname = url.pathname;

      if (pathname === "/health") {
        return jsonResponse(res, 200, { status: "ok", service: "e2e-mocks" });
      }

      // OpenAI embeddings mock (backoffice-api Knowledge Base)
      if (pathname === "/openai/v1/embeddings" && req.method === "POST") {
        const raw = await readBody(req);
        const parsed = raw.length ? JSON.parse(raw.toString("utf8")) : {};
        const input = parsed.input ?? [];
        const arr = Array.isArray(input) ? input : [input];
        return jsonResponse(res, 200, {
          object: "list",
          data: arr.map((item, idx) => ({
            object: "embedding",
            index: idx,
            embedding: makeEmbeddingVector(item),
          })),
          model: parsed.model ?? "text-embedding-3-small",
          usage: { prompt_tokens: 0, total_tokens: 0 },
        });
      }

      // OpenAI chat completions mock (agent-runtime Centurion test)
      if (pathname === "/openai/v1/chat/completions" && req.method === "POST") {
        const raw = await readBody(req);
        const parsed = raw.length ? JSON.parse(raw.toString("utf8")) : {};
        const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
        const lastUser = [...messages].reverse().find((m) => m && m.role === "user" && typeof m.content === "string");
        const content = lastUser ? `E2E: ${lastUser.content}` : "E2E: ok";

        return jsonResponse(res, 200, {
          id: `chatcmpl_${crypto.randomUUID().slice(0, 8)}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: parsed.model ?? "gpt-4o-mini",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });
      }

      // OpenAI responses mock (future-proof, some libs default to /responses)
      if (pathname === "/openai/v1/responses" && req.method === "POST") {
        const raw = await readBody(req);
        const parsed = raw.length ? JSON.parse(raw.toString("utf8")) : {};
        const input = parsed.input;
        const toText = (value) => {
          if (typeof value === "string") return value;
          if (Array.isArray(value)) {
            const textPart = value.find((p) => p && p.type === "input_text" && typeof p.text === "string");
            if (textPart?.text) return String(textPart.text);
          }
          return "";
        };
        const content = toText(input) ? `E2E: ${toText(input)}` : "E2E: ok";

        return jsonResponse(res, 200, {
          id: `resp_${crypto.randomUUID().slice(0, 8)}`,
          object: "response",
          created_at: Math.floor(Date.now() / 1000),
          model: parsed.model ?? "gpt-4o-mini",
          output_text: content,
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: content }],
            },
          ],
        });
      }

      // Facebook Graph mock (backoffice-api pixels.test + facebook-capi sender)
      const fbMatch = pathname.match(/^\/facebook\/([^/]+)\/([^/]+)\/events$/);
      if (fbMatch && req.method === "POST") {
        const raw = await readBody(req);
        const parsed = raw.length ? JSON.parse(raw.toString("utf8")) : {};
        const events = Array.isArray(parsed.data) ? parsed.data : [];
        const fbtrace_id = `fbtrace_${crypto.randomUUID().slice(0, 8)}`;
        return jsonResponse(res, 200, {
          events_received: events.length,
          messages: parsed.test_event_code ? [{ code: "TEST_EVENT", message: "Test event received" }] : [],
          fbtrace_id,
        });
      }

      // Evolution API mock
      if (pathname.startsWith("/evolution/")) {
        const basePath = pathname.slice("/evolution".length);
        const parts = basePath.split("/").filter(Boolean);
        const [group, action, ...rest] = parts;

        const getInstance = (name) => {
          const current = store.evolution.get(name);
          if (current) return current;
          const next = { state: "close", qrcode: "data:image/png;base64,VEVTVF9RUl9DT0RF" };
          store.evolution.set(name, next);
          return next;
        };

        if (group === "instance" && action === "create" && req.method === "POST") {
          const raw = await readBody(req);
          const body = raw.length ? JSON.parse(raw.toString("utf8")) : {};
          const instanceName = body.instanceName || body.instance_name || `inst_${crypto.randomUUID().slice(0, 6)}`;
          getInstance(instanceName);
          return jsonResponse(res, 200, { instanceName });
        }

        if (group === "instance" && action === "delete" && req.method === "DELETE") {
          const name = decodeURIComponent(rest.join("/"));
          store.evolution.delete(name);
          return jsonResponse(res, 200, { ok: true });
        }

        if (group === "instance" && action === "connect" && req.method === "POST") {
          const name = decodeURIComponent(rest.join("/"));
          const inst = getInstance(name);
          inst.state = "qr";
          return jsonResponse(res, 200, { qrcode: inst.qrcode });
        }

        if (group === "instance" && action === "connect" && req.method === "GET") {
          const name = decodeURIComponent(rest.join("/"));
          const inst = getInstance(name);
          return jsonResponse(res, 200, { qrcode: inst.qrcode });
        }

        if (group === "instance" && action === "logout" && req.method === "DELETE") {
          const name = decodeURIComponent(rest.join("/"));
          const inst = getInstance(name);
          inst.state = "close";
          return jsonResponse(res, 200, { ok: true });
        }

        if (group === "instance" && action === "connectionState" && req.method === "GET") {
          const name = decodeURIComponent(rest.join("/"));
          const inst = getInstance(name);
          const state = inst.state === "close" ? "close" : inst.state === "qr" ? "qr" : "open";
          return jsonResponse(res, 200, { state, instance: name, provider: "mock" });
        }

        if (group === "message" && action?.startsWith("send") && req.method === "POST") {
          return jsonResponse(res, 200, { messageId: `msg_${crypto.randomUUID().slice(0, 8)}` });
        }

        return jsonResponse(res, 404, { error: "not_found", path: pathname });
      }

      // Telegram API mock
      if (pathname.startsWith("/telegram/")) {
        const parts = pathname.slice("/telegram".length).split("/").filter(Boolean);
        const [botPrefix, method] = parts;

        if (!botPrefix?.startsWith("bot")) {
          return jsonResponse(res, 404, { ok: false, description: "invalid bot path" });
        }

        const token = botPrefix.slice("bot".length);
        const webhookKey = token;
        const getWebhookUrl = () => store.telegram.get(webhookKey) || "";

        if (method === "setWebhook" && req.method === "POST") {
          const raw = await readBody(req);
          const body = raw.length ? JSON.parse(raw.toString("utf8")) : {};
          if (typeof body.url === "string") store.telegram.set(webhookKey, body.url);
          return jsonResponse(res, 200, { ok: true, result: true });
        }

        if (method === "deleteWebhook" && req.method === "POST") {
          store.telegram.delete(webhookKey);
          return jsonResponse(res, 200, { ok: true, result: true });
        }

        if (method === "getWebhookInfo" && req.method === "GET") {
          return jsonResponse(res, 200, {
            ok: true,
            result: { url: getWebhookUrl(), has_custom_certificate: false, pending_update_count: 0 },
          });
        }

        if (method === "sendMessage" && req.method === "POST") {
          return jsonResponse(res, 200, { ok: true, result: { message_id: Number(Date.now()) } });
        }

        if (method === "getFile" && req.method === "POST") {
          const raw = await readBody(req);
          const body = raw.length ? JSON.parse(raw.toString("utf8")) : {};
          const fileId = String(body.file_id || "file");
          return jsonResponse(res, 200, {
            ok: true,
            result: { file_id: fileId, file_unique_id: fileId, file_path: `files/${fileId}.dat` },
          });
        }

        return jsonResponse(res, 404, { ok: false, description: "unknown telegram method" });
      }

      if (pathname.startsWith("/telegram/file/") && req.method === "GET") {
        const buf = Buffer.from("e2e-telegram-file");
        res.writeHead(200, { "content-type": "application/octet-stream", "content-length": buf.length });
        return res.end(buf);
      }

      // Autentique GraphQL mock
      if (pathname === "/autentique/v2/graphql" && req.method === "POST") {
        const contentType = String(req.headers["content-type"] || "");

        if (contentType.startsWith("multipart/form-data")) {
          // createDocument uses multipart; we don't parse the form payload.
          await readBody(req);
          const documentId = crypto.randomUUID();
          const publicId = crypto.randomUUID();
          const shortLink = `http://127.0.0.1:${port}/autentique/sign/${encodeURIComponent(publicId)}`;
          const signedUrl = `http://127.0.0.1:${port}/autentique/files/signed/${encodeURIComponent(documentId)}.pdf`;
          store.autentique.set(documentId, { publicId, shortLink, signedUrl });
          return jsonResponse(res, 200, {
            data: {
              createDocument: {
                id: documentId,
                name: "E2E Document",
                signatures: [{ public_id: publicId, name: "E2E", email: "e2e@example.com", link: { short_link: shortLink } }],
              },
            },
          });
        }

        const raw = await readBody(req);
        const body = raw.length ? JSON.parse(raw.toString("utf8")) : {};
        const query = String(body.query || "");

        if (query.includes("createLinkToSignature")) {
          const match = query.match(/createLinkToSignature\s*\(\s*public_id\s*:\s*"?([^")]+)"?/);
          const publicId = match?.[1] ? String(match[1]) : crypto.randomUUID();
          const shortLink = `http://127.0.0.1:${port}/autentique/sign/${encodeURIComponent(publicId)}`;
          return jsonResponse(res, 200, { data: { createLinkToSignature: { short_link: shortLink } } });
        }

        if (query.includes("document(")) {
          const match = query.match(/document\s*\(\s*id\s*:\s*"?([^")]+)"?/);
          const documentId = match?.[1] ? String(match[1]) : crypto.randomUUID();
          const existing = store.autentique.get(documentId);
          const signedUrl =
            existing?.signedUrl ?? `http://127.0.0.1:${port}/autentique/files/signed/${encodeURIComponent(documentId)}.pdf`;
          return jsonResponse(res, 200, {
            data: {
              document: {
                id: documentId,
                name: "E2E Document",
                created_at: new Date().toISOString(),
                files: { original: signedUrl, signed: signedUrl, pades: signedUrl },
                signatures: [
                  {
                    public_id: existing?.publicId ?? crypto.randomUUID(),
                    name: "E2E",
                    email: "e2e@example.com",
                    created_at: new Date().toISOString(),
                    action: { name: "SIGN" },
                    link: { short_link: existing?.shortLink ?? null },
                    signed: { created_at: new Date().toISOString() },
                  },
                ],
              },
            },
          });
        }

        return jsonResponse(res, 200, { data: {} });
      }

      if (pathname.startsWith("/autentique/files/signed/") && req.method === "GET") {
        const pdf = Buffer.from("%PDF-1.4\n%mock\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n", "utf8");
        res.writeHead(200, { "content-type": "application/pdf", "content-length": pdf.length });
        return res.end(pdf);
      }

      return jsonResponse(res, 404, { error: "not_found", path: pathname });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse(res, 500, { error: "internal_error", message });
    }
  });

  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return { server, store };
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

async function seedDefaultIntegrationCredentialSets(dbUrl) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const openaiApiKey = String(process.env.OPENAI_API_KEY || "e2e-openai-key");
  const openaiBaseUrl = String(process.env.OPENAI_BASE_URL || "http://127.0.0.1:4900/openai/v1");

  const evolutionApiKey = String(process.env.EVOLUTION_API_KEY || "e2e-evolution-key");
  const evolutionApiUrl = String(process.env.EVOLUTION_API_URL || "http://127.0.0.1:4900/evolution");

  const autentiqueApiKey = String(process.env.AUTENTIQUE_API_KEY || "e2e-autentique-key");
  const autentiqueBaseUrl = String(process.env.AUTENTIQUE_BASE_URL || "http://127.0.0.1:4900/autentique/v2");
  const autentiqueWebhookSecret = String(process.env.AUTENTIQUE_WEBHOOK_SECRET || "e2e-autentique-webhook-secret");

  try {
    await client.query("begin");

    await client.query(
      `insert into core.integration_credential_sets (provider, name, is_default, config, secrets_enc)
       values ($1, $2, true, $3::jsonb, $4)`,
      [
        "openai",
        "E2E Default",
        JSON.stringify({ base_url: openaiBaseUrl, embedding_model: "text-embedding-3-small", chat_model: "gpt-4o-mini", vision_model: "gpt-4o-mini", stt_model: "whisper-1" }),
        encryptJson({ api_key: openaiApiKey }),
      ],
    );

    await client.query(
      `insert into core.integration_credential_sets (provider, name, is_default, config, secrets_enc)
       values ($1, $2, true, $3::jsonb, $4)`,
      [
        "evolution",
        "E2E Default",
        JSON.stringify({ api_url: evolutionApiUrl }),
        encryptJson({ api_key: evolutionApiKey }),
      ],
    );

    await client.query(
      `insert into core.integration_credential_sets (provider, name, is_default, config, secrets_enc)
       values ($1, $2, true, $3::jsonb, $4)`,
      [
        "autentique",
        "E2E Default",
        JSON.stringify({ base_url: autentiqueBaseUrl }),
        encryptJson({ api_key: autentiqueApiKey, webhook_secret: autentiqueWebhookSecret }),
      ],
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, "../..");
  const webPort = Number(process.env.E2E_WEB_PORT || 3100);
  const apiPort = Number(process.env.E2E_API_PORT || 4100);
  const evolutionPort = Number(process.env.E2E_EVOLUTION_PORT || 4101);
  const autentiquePort = Number(process.env.E2E_AUTENTIQUE_PORT || 4102);
  const capiPort = Number(process.env.E2E_CAPI_PORT || 4103);
  const agentPort = Number(process.env.E2E_AGENT_PORT || 5100);
  const mockPort = Number(process.env.E2E_MOCK_PORT || 4900);

  loadDotEnvFile(path.join(repoRoot, ".env"));

  const supabaseUrl = (process.env.SUPABASE_URL || "http://127.0.0.1:54321").replace("host.docker.internal", "127.0.0.1");
  process.env.SUPABASE_URL = supabaseUrl;
  process.env.SUPABASE_DB_URL =
    (process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres").replace(
      "host.docker.internal",
      "127.0.0.1",
    );

  process.env.REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  process.env.NODE_ENV = "e2e";
  process.env.PROMETHEUS_ENABLED = "false";
  process.env.OTEL_TRACING_ENABLED = "false";
  process.env.DISABLE_WORKERS = "false";
  process.env.APP_ENCRYPTION_KEY_CURRENT = process.env.APP_ENCRYPTION_KEY_CURRENT || process.env.APP_ENCRYPTION_KEY || "e2e-encryption-key";
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "e2e-openai-key";

  const corsOrigins = new Set(
    String(process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  corsOrigins.add(`http://localhost:${webPort}`);
  corsOrigins.add(`http://127.0.0.1:${webPort}`);
  process.env.CORS_ORIGIN = Array.from(corsOrigins).join(",");

  const mockBaseUrl = `http://127.0.0.1:${mockPort}`;
  process.env.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || `${mockBaseUrl}/openai/v1`;
  process.env.FACEBOOK_GRAPH_BASE_URL = process.env.FACEBOOK_GRAPH_BASE_URL || `${mockBaseUrl}/facebook`;
  process.env.EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || `${mockBaseUrl}/evolution`;
  process.env.EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "e2e-evolution-key";
  process.env.TELEGRAM_API_BASE_URL = process.env.TELEGRAM_API_BASE_URL || `${mockBaseUrl}/telegram`;
  process.env.TELEGRAM_WEBHOOK_BASE_URL = process.env.TELEGRAM_WEBHOOK_BASE_URL || `http://127.0.0.1:${evolutionPort}`;
  process.env.TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "e2e-telegram-webhook-secret";
  process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "e2e-webhook-secret";
  process.env.AUTENTIQUE_BASE_URL = process.env.AUTENTIQUE_BASE_URL || `${mockBaseUrl}/autentique/v2`;
  process.env.AUTENTIQUE_API_KEY = process.env.AUTENTIQUE_API_KEY || "e2e-autentique-key";
  process.env.AUTENTIQUE_WEBHOOK_SECRET = process.env.AUTENTIQUE_WEBHOOK_SECRET || "e2e-autentique-webhook-secret";

  try {
    try {
      execSync("npx supabase stop --workdir . --no-backup --yes", { cwd: repoRoot, stdio: "inherit" });
    } catch {
      // ignore (may not be running yet)
    }
    execSync("npx supabase start --workdir . --exclude studio --yes", { cwd: repoRoot, stdio: "inherit" });
    execSync("npx supabase db reset --workdir . --local --no-seed --yes", { cwd: repoRoot, stdio: "inherit" });
    await resetDatabase(process.env.SUPABASE_DB_URL);
    await seedDefaultIntegrationCredentialSets(process.env.SUPABASE_DB_URL);
    execSync("docker compose -f infra/compose/docker-compose.yml up -d redis", { cwd: repoRoot, stdio: "inherit" });
  } catch (err) {
    console.error("Failed to prepare e2e environment:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const mocks = await startMockServer({ port: mockPort });
  await waitForOk(`${mockBaseUrl}/health`, 30_000);

  const agentPython = path.join(repoRoot, "agent-runtime", ".venv", "bin", "python");
  const agent = spawn(fs.existsSync(agentPython) ? agentPython : "python3", [
    "-m",
    "uvicorn",
    "api.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    String(agentPort),
  ], {
    cwd: path.join(repoRoot, "agent-runtime"),
    env: { ...process.env, PORT: String(agentPort), PYTHONPATH: "src", DISABLE_WORKERS: "true" },
    stdio: "inherit",
  });
  await waitForOk(`http://127.0.0.1:${agentPort}/health`, 120_000);

  const evolution = spawn("npm", ["-w", "@wolfgang/evolution-manager", "run", "start:dev"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(evolutionPort) },
    stdio: "inherit",
  });
  await waitForOk(`http://127.0.0.1:${evolutionPort}/health`, 120_000);

  const autentique = spawn("npm", ["-w", "@wolfgang/autentique-service", "run", "start:dev"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(autentiquePort) },
    stdio: "inherit",
  });
  await waitForOk(`http://127.0.0.1:${autentiquePort}/health`, 120_000);

  const capi = spawn("npm", ["-w", "@wolfgang/facebook-capi", "run", "start:dev"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(capiPort) },
    stdio: "inherit",
  });
  await waitForOk(`http://127.0.0.1:${capiPort}/health`, 120_000);

  const api = spawn("npm", ["-w", "@wolfgang/backoffice-api", "run", "start:dev"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(apiPort),
      AUTENTIQUE_SERVICE_URL: `http://127.0.0.1:${autentiquePort}`,
      AGENT_RUNTIME_URL: `http://127.0.0.1:${agentPort}`,
    },
    stdio: "inherit",
  });

  await waitForOk(`http://127.0.0.1:${apiPort}/health`, 120_000);

  const webEnv = {
    ...process.env,
    // E2E must be deterministic and must not inherit dev `.env` URLs.
    // In this environment, `localhost` may resolve to IPv6-only (::1) while the API binds on IPv4.
    NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
    NEXT_PUBLIC_EVOLUTION_MANAGER_URL: `http://127.0.0.1:${evolutionPort}`,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  };

  const nextBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
  const web = spawn(nextBin, ["dev", "-p", String(webPort)], {
    cwd: path.join(repoRoot, "backoffice-web"),
    env: webEnv,
    stdio: "inherit",
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    api.kill("SIGTERM");
    capi.kill("SIGTERM");
    autentique.kill("SIGTERM");
    evolution.kill("SIGTERM");
    agent.kill("SIGTERM");
    web.kill("SIGTERM");
    mocks.server.close();

    setTimeout(() => {
      api.kill("SIGKILL");
      capi.kill("SIGKILL");
      autentique.kill("SIGKILL");
      evolution.kill("SIGKILL");
      agent.kill("SIGKILL");
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
  capi.once("exit", (code) => {
    console.error(`facebook-capi exited (code=${code ?? "null"})`);
    shutdown();
  });
  autentique.once("exit", (code) => {
    console.error(`autentique-service exited (code=${code ?? "null"})`);
    shutdown();
  });
  evolution.once("exit", (code) => {
    console.error(`evolution-manager exited (code=${code ?? "null"})`);
    shutdown();
  });
  agent.once("exit", (code) => {
    console.error(`agent-runtime exited (code=${code ?? "null"})`);
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
