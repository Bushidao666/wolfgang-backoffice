import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";

import { LoggerService } from "../logging/logger.service";

type RequestWithMeta = Request & { requestId?: string };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithMeta>();
    const res = http.getResponse<Response>();

    const requestId = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const correlationId = (req.headers["x-correlation-id"] as string | undefined) ?? requestId;
    req.requestId = requestId;
    req.headers["x-request-id"] = requestId;
    req.headers["x-correlation-id"] = correlationId;
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-correlation-id", correlationId);

    const startedAt = Date.now();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log("request.completed", {
          module: controller,
          handler,
          request_id: requestId,
          correlation_id: correlationId,
          method: req.method,
          path: req.url,
          status_code: (res as any)?.statusCode,
          duration_ms: durationMs,
        });
      }),
      catchError((err) => {
        const durationMs = Date.now() - startedAt;
        this.logger.error("request.failed", {
          module: controller,
          handler,
          request_id: requestId,
          correlation_id: correlationId,
          method: req.method,
          path: req.url,
          status_code: (res as any)?.statusCode,
          duration_ms: durationMs,
          error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        });
        return throwError(() => err);
      }),
    );
  }
}
