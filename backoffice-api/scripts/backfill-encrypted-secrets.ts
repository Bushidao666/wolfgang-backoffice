import { createClient } from "@supabase/supabase-js";

import { encryptJson, encryptV1, loadKeyringFromEnv } from "@wolfgang/crypto";

type SupabaseAdmin = ReturnType<typeof createClient>;

function requireEnv(name: string): string {
  const value = (process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hasKeys(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length > 0;
}

function encryptJsonOrEmpty(value: Record<string, unknown>): string {
  return hasKeys(value) ? encryptJson(value) : "";
}

async function mapConcurrent<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function backfillTelegramTokens(admin: SupabaseAdmin, opts: { dryRun: boolean; pageSize: number }) {
  let offset = 0;
  let updated = 0;

  for (;;) {
    const { data, error } = await admin
      .schema("core")
      .from("channel_instances")
      .select("id, telegram_bot_token, telegram_bot_token_enc")
      .not("telegram_bot_token", "is", null)
      .range(offset, offset + opts.pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as { id: string; telegram_bot_token: string | null; telegram_bot_token_enc: string | null }[];
    if (!rows.length) break;

    const toUpdate = rows.filter((r) => {
      const plain = (r.telegram_bot_token ?? "").trim();
      const enc = (r.telegram_bot_token_enc ?? "").trim();
      return !!plain && !enc;
    });

    await mapConcurrent(toUpdate, 10, async (r) => {
      const plain = (r.telegram_bot_token ?? "").trim();
      const patch = {
        telegram_bot_token_enc: encryptV1(plain),
        telegram_bot_token: null,
      };
      if (!opts.dryRun) {
        const { error: updErr } = await admin.schema("core").from("channel_instances").update(patch).eq("id", r.id);
        if (updErr) throw updErr;
      }
      updated += 1;
    });

    if (rows.length < opts.pageSize) break;
    offset += opts.pageSize;
  }

  return { updated };
}

async function backfillToolSecrets(admin: SupabaseAdmin, opts: { dryRun: boolean; pageSize: number }) {
  let offset = 0;
  let updated = 0;

  for (;;) {
    const { data, error } = await admin
      .schema("core")
      .from("tool_configs")
      .select("id, headers, headers_enc, auth_config, auth_secrets_enc")
      .range(offset, offset + opts.pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as {
      id: string;
      headers: unknown;
      headers_enc: string;
      auth_config: unknown;
      auth_secrets_enc: string;
    }[];
    if (!rows.length) break;

    const toUpdate = rows
      .map((r) => {
        const headers = jsonObject(r.headers);
        const auth = jsonObject(r.auth_config);
        const needsHeaders = !String(r.headers_enc ?? "").trim() && hasKeys(headers);
        const needsAuth = !String(r.auth_secrets_enc ?? "").trim() && hasKeys(auth);
        if (!needsHeaders && !needsAuth) return null;
        return {
          id: r.id,
          headers,
          auth,
          needsHeaders,
          needsAuth,
        };
      })
      .filter(Boolean) as {
      id: string;
      headers: Record<string, unknown>;
      auth: Record<string, unknown>;
      needsHeaders: boolean;
      needsAuth: boolean;
    }[];

    await mapConcurrent(toUpdate, 10, async (r) => {
      const patch: Record<string, unknown> = {
        headers: {},
        auth_config: {},
      };

      if (r.needsHeaders) patch.headers_enc = encryptJsonOrEmpty(r.headers);
      if (r.needsAuth) patch.auth_secrets_enc = encryptJsonOrEmpty(r.auth);

      if (!opts.dryRun) {
        const { error: updErr } = await admin.schema("core").from("tool_configs").update(patch).eq("id", r.id);
        if (updErr) throw updErr;
      }
      updated += 1;
    });

    if (rows.length < opts.pageSize) break;
    offset += opts.pageSize;
  }

  return { updated };
}

async function backfillMcpSecrets(admin: SupabaseAdmin, opts: { dryRun: boolean; pageSize: number }) {
  let offset = 0;
  let updated = 0;

  for (;;) {
    const { data, error } = await admin
      .schema("core")
      .from("mcp_servers")
      .select("id, auth_config, auth_secrets_enc")
      .range(offset, offset + opts.pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as { id: string; auth_config: unknown; auth_secrets_enc: string }[];
    if (!rows.length) break;

    const toUpdate = rows
      .map((r) => {
        const auth = jsonObject(r.auth_config);
        const needsAuth = !String(r.auth_secrets_enc ?? "").trim() && hasKeys(auth);
        if (!needsAuth) return null;
        return { id: r.id, auth };
      })
      .filter(Boolean) as { id: string; auth: Record<string, unknown> }[];

    await mapConcurrent(toUpdate, 10, async (r) => {
      const patch: Record<string, unknown> = {
        auth_config: {},
        auth_secrets_enc: encryptJsonOrEmpty(r.auth),
      };
      if (!opts.dryRun) {
        const { error: updErr } = await admin.schema("core").from("mcp_servers").update(patch).eq("id", r.id);
        if (updErr) throw updErr;
      }
      updated += 1;
    });

    if (rows.length < opts.pageSize) break;
    offset += opts.pageSize;
  }

  return { updated };
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  // Ensure encryption key is configured (encryptJson/encryptV1 will also throw).
  loadKeyringFromEnv();

  const dryRun = (process.env.DRY_RUN ?? "").toLowerCase() === "true";
  const pageSize = Number(process.env.PAGE_SIZE ?? 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const start = Date.now();
  const telegram = await backfillTelegramTokens(admin, { dryRun, pageSize });
  const tools = await backfillToolSecrets(admin, { dryRun, pageSize });
  const mcp = await backfillMcpSecrets(admin, { dryRun, pageSize });

  const ms = Date.now() - start;
  const summary = {
    dry_run: dryRun,
    updated: {
      telegram_tokens: telegram.updated,
      tool_configs: tools.updated,
      mcp_servers: mcp.updated,
    },
    duration_ms: ms,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

