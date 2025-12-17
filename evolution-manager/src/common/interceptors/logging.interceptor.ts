import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { randomUUID } from "crypto";
import { Request, Response } from "express";

import { LoggerService } from "../logging/logger.service";

type RequestWithMeta = Request & { requestId?: string; correlationId?: string };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithMeta>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();
    const requestId = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const correlationId = (req.headers["x-correlation-id"] as string | undefined) ?? requestId;
    req.requestId = requestId;
    req.correlationId = correlationId;
    req.headers["x-request-id"] = requestId;
    req.headers["x-correlation-id"] = correlationId;
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-correlation-id", correlationId);

    return next.handle().pipe(
      tap(() => {
        this.logger.log("request.completed", {
          request_id: requestId,
          correlation_id: correlationId,
          method: req.method,
          path: req.url,
          duration_ms: Date.now() - startedAt,
          status_code: (res as any)?.statusCode,
        });
      }),
      catchError((err) => {
        this.logger.error("request.failed", {
          request_id: requestId,
          correlation_id: correlationId,
          method: req.method,
          path: req.url,
          duration_ms: Date.now() - startedAt,
          error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        });
        return throwError(() => err);
      }),
    );
  }
}
