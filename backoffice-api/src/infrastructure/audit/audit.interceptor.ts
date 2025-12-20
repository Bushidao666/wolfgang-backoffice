import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { AuditService } from "../../common/audit/audit.service";

type RequestUser = {
  sub?: string;
  role?: string;
  company_id?: string;
};

function parseEntityId(id?: string) {
  if (!id) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

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
    const companyIdFromScope =
      (req.headers["x-company-id"] as string | undefined) ??
      (req.user?.company_id as string | undefined) ??
      null;

    const actorUserId = req.user?.sub ?? null;
    const actorRole = req.user?.role ?? null;

    const firstSegment = path.replace(/^\//, "").split("/")[0] || null;
    const entityIdFromParams = parseEntityId((req.params as any)?.id) ?? parseEntityId((req.params as any)?.companyId) ?? null;

    const ipAddress =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      (req.socket?.remoteAddress ?? null);

    const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;

    return next.handle().pipe(
      tap((data) => {
        let companyId = companyIdFromScope;
        let entityId = entityIdFromParams;

        // Some holding-scoped writes (e.g. POST /companies) don't have x-company-id/user.company_id.
        // When the response contains a company id, use it for auditing.
        if (!companyId && method === "POST" && path === "/companies" && data && typeof data === "object") {
          const candidate = parseEntityId((data as any).id) ?? parseEntityId((data as any).company_id);
          if (candidate) {
            companyId = candidate;
            entityId = candidate;
          }
        }

        if (!companyId) return;

        void this.audit.write({
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
          metadata: {
            method,
            path,
            params: req.params ?? {},
            query: req.query ?? {},
            body: (req as any).body ?? null,
            status_code: (res as any).statusCode,
          },
        });
      }),
    );
  }
}
