import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { LoggerService } from "../../common/logging/logger.service";
import { SupabaseService } from "../supabase/supabase.service";

type RequestUser = {
  sub?: string;
  role?: string;
  company_id?: string;
};

const REDACT_KEYS = new Set(
  [
    "password",
    "pass",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "api_key",
    "secret",
    "client_secret",
    "meta_access_token",
  ].map((k) => k.toLowerCase()),
);

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
      if (REDACT_KEYS.has(k.toLowerCase())) {
        out[k] = "[REDACTED]";
        continue;
      }
      out[k] = redact(v, depth - 1, seen);
    }
    return out;
  }

  return String(value);
}

function parseEntityId(id?: string) {
  if (!id) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string; correlationId?: string; user?: RequestUser }>();
    const res = http.getResponse<Response>();

    if (!req || !res) return next.handle();

    const method = (req.method ?? "GET").toUpperCase();
    const path = (req.url ?? "").split("?")[0];

    const isWrite = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
    if (!isWrite) return next.handle();

    if (path === "/health" || path === "/metrics" || path.startsWith("/auth")) {
      return next.handle();
    }

    const requestId = req.requestId ?? (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const correlationId =
      req.correlationId ??
      (req.headers["x-correlation-id"] as string | undefined) ??
      requestId;
    const companyId =
      (req.headers["x-company-id"] as string | undefined) ??
      (req.user?.company_id as string | undefined) ??
      null;

    const actorUserId = req.user?.sub ?? null;
    const actorRole = req.user?.role ?? null;

    const firstSegment = path.replace(/^\//, "").split("/")[0] || null;
    const entityId = parseEntityId((req.params as any)?.id) ?? parseEntityId((req.params as any)?.companyId) ?? null;

    const ipAddress =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      (req.socket?.remoteAddress ?? null);

    const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;

    const metadata = redact({
      method,
      path,
      params: req.params ?? {},
      query: req.query ?? {},
      body: (req as any).body ?? null,
      status_code: (res as any).statusCode,
    });

    return next.handle().pipe(
      tap(() => {
        if (!companyId) return;
        void this.writeAudit({
          company_id: companyId,
          actor_user_id: actorUserId,
          actor_role: actorRole,
          action: method,
          entity_type: firstSegment,
          entity_id: entityId,
          request_id: requestId,
          correlation_id: correlationId,
          ip_address: ipAddress,
          user_agent: userAgent,
          before: null,
          after: null,
          metadata,
        });
      }),
    );
  }

  private async writeAudit(row: Record<string, unknown>) {
    try {
      const { error } = await this.supabase.getAdminClient().schema("core").from("audit_logs").insert(row);
      if (error) {
        this.logger.warn("audit.insert_failed", { error });
      }
    } catch (err) {
      this.logger.warn("audit.insert_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
