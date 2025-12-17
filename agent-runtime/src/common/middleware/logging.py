import logging
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from common.config.logging import company_id_ctx, correlation_id_ctx, request_id_ctx
from common.infrastructure.metrics.prometheus import HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        token_req = request_id_ctx.set(request_id)

        correlation_id = request.headers.get("x-correlation-id") or request_id
        token_corr = correlation_id_ctx.set(correlation_id)

        company_id = request.headers.get("x-company-id")
        token_company = company_id_ctx.set(company_id)

        started_at = time.time()

        try:
            response: Response = await call_next(request)
            duration_ms = int((time.time() - started_at) * 1000)

            response.headers["x-request-id"] = request_id
            response.headers["x-correlation-id"] = correlation_id

            logger.info(
                "request.completed",
                extra={
                    "extra": {
                        "module": "http",
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                    }
                },
            )

            HTTP_REQUESTS_TOTAL.labels(
                method=request.method,
                path=request.url.path,
                status_code=str(response.status_code),
            ).inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=request.method,
                path=request.url.path,
                status_code=str(response.status_code),
            ).observe(duration_ms / 1000)

            return response
        except Exception:
            duration_ms = int((time.time() - started_at) * 1000)
            logger.exception(
                "request.failed",
                extra={
                    "extra": {
                        "module": "http",
                        "method": request.method,
                        "path": request.url.path,
                        "duration_ms": duration_ms,
                    }
                },
            )

            HTTP_REQUESTS_TOTAL.labels(method=request.method, path=request.url.path, status_code="500").inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(method=request.method, path=request.url.path, status_code="500").observe(duration_ms / 1000)
            raise
        finally:
            request_id_ctx.reset(token_req)
            correlation_id_ctx.reset(token_corr)
            company_id_ctx.reset(token_company)
