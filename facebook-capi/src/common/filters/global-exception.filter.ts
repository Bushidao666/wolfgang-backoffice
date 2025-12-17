import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { DomainError } from "@wolfgang/contracts";
import { Request, Response } from "express";

import { LoggerService } from "../logging/logger.service";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers["x-request-id"] as string | undefined) ?? null;
    const correlationId =
      (request.headers["x-correlation-id"] as string | undefined) ?? requestId;

    if (exception instanceof DomainError) {
      this.logger.warn("domain.error", { request_id: requestId, correlation_id: correlationId, code: exception.code, details: exception.details });
      response.status(exception.statusCode ?? 422).json({
        request_id: requestId,
        correlation_id: correlationId,
        path: request.url,
        method: request.method,
        status_code: exception.statusCode ?? 422,
        code: exception.code,
        message: exception.message,
        details: exception.details,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      response.status(status).json({
        request_id: requestId,
        correlation_id: correlationId,
        path: request.url,
        method: request.method,
        status_code: status,
        message: typeof payload === "string" ? payload : (payload as any)?.message ?? exception.message,
        details: typeof payload === "object" ? payload : undefined,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.error("unhandled.error", {
      request_id: requestId,
      correlation_id: correlationId,
      error: exception instanceof Error ? { message: exception.message, stack: exception.stack } : exception,
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      request_id: requestId,
      correlation_id: correlationId,
      path: request.url,
      method: request.method,
      status_code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
}
