import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? undefined;
    const correlationId =
      (request.headers["x-correlation-id"] as string | undefined) ?? requestId;

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = isHttpException ? exception.getResponse() : undefined;
    const message = isHttpException
      ? typeof errorResponse === "string"
        ? errorResponse
        : (errorResponse as any)?.message ?? exception?.toString()
      : "Internal server error";

    response.status(status).json({
      request_id: requestId,
      correlation_id: correlationId,
      path: request.url,
      method: request.method,
      status_code: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
