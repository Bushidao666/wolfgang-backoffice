import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";

import { PrometheusService } from "./prometheus.service";

@Injectable()
export class PrometheusInterceptor implements NestInterceptor {
  constructor(private readonly prometheus: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (!req || !res) return next.handle();
    const path = (req.url ?? "").split("?")[0];
    if (path === "/metrics") return next.handle();

    const startedAt = Date.now();
    const route = (req as any).route?.path ? String((req as any).route.path) : path;

    return next.handle().pipe(
      tap(() => {
        this.prometheus.observeHttpRequest({
          method: req.method,
          route,
          statusCode: (res as any).statusCode ?? 200,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((err) => {
        this.prometheus.observeHttpRequest({
          method: req.method,
          route,
          statusCode: (res as any).statusCode ?? 500,
          durationMs: Date.now() - startedAt,
        });
        return throwError(() => err);
      }),
    );
  }
}

