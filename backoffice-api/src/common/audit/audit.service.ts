import { Injectable } from "@nestjs/common";

import { LoggerService } from "../logging/logger.service";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { AuditLogInsert } from "./audit.types";

const REDACT_EXACT_KEYS = new Set(
  [
    "password",
    "pass",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "api_key",
    "apikey",
    "secret",
    "client_secret",
    "meta_access_token",
    "supabase_service_role_key",
  ].map((k) => k.toLowerCase()),
);

const REDACT_KEYWORDS = ["password", "token", "secret", "api_key", "apikey", "authorization"];

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  if (REDACT_EXACT_KEYS.has(normalized)) return true;
  return REDACT_KEYWORDS.some((kw) => normalized.includes(kw));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function redact(value: unknown, depth = 6, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (depth <= 0) return "[Truncated]";

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth - 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (!isPlainObject(value)) {
      try {
        return String(value);
      } catch {
        return "[Unserializable]";
      }
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (shouldRedactKey(k)) {
        out[k] = "[REDACTED]";
        continue;
      }
      out[k] = redact(v, depth - 1, seen);
    }
    return out;
  }

  return String(value);
}

@Injectable()
export class AuditService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {}

  async write(row: AuditLogInsert): Promise<void> {
    const payload: Record<string, unknown> = {
      ...row,
      actor_user_id: row.actor_user_id ?? null,
      actor_role: row.actor_role ?? null,
      entity_type: row.entity_type ?? null,
      entity_id: row.entity_id ?? null,
      request_id: row.request_id ?? null,
      correlation_id: row.correlation_id ?? null,
      ip_address: row.ip_address ?? null,
      user_agent: row.user_agent ?? null,
      before: row.before ? redact(row.before) : null,
      after: row.after ? redact(row.after) : null,
      metadata: row.metadata ? redact(row.metadata) : {},
    };

    try {
      const { error } = await this.supabase.getAdminClient().schema("core").from("audit_logs").insert(payload);
      if (error) {
        this.logger.warn("audit.insert_failed", { error });
      }
    } catch (err) {
      this.logger.warn("audit.insert_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}

