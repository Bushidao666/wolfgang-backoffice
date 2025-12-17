import json
import logging
import os
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
correlation_id_ctx: ContextVar[str | None] = ContextVar("correlation_id", default=None)
company_id_ctx: ContextVar[str | None] = ContextVar("company_id", default=None)

REDACT_KEYS = {
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
}

STANDARD_RECORD_ATTRS = {
    "name",
    "msg",
    "args",
    "levelname",
    "levelno",
    "pathname",
    "filename",
    "module",
    "exc_info",
    "exc_text",
    "stack_info",
    "lineno",
    "funcName",
    "created",
    "msecs",
    "relativeCreated",
    "thread",
    "threadName",
    "processName",
    "process",
    "message",
}


def _redact(value: Any, *, depth: int = 6, seen: set[int] | None = None) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if depth <= 0:
        return "[Truncated]"

    if seen is None:
        seen = set()

    if isinstance(value, dict):
        obj_id = id(value)
        if obj_id in seen:
            return "[Circular]"
        seen.add(obj_id)

        out: dict[str, Any] = {}
        for k, v in value.items():
            if isinstance(k, str) and k.lower() in REDACT_KEYS:
                out[k] = "[REDACTED]"
                continue
            out[k] = _redact(v, depth=depth - 1, seen=seen)
        return out

    if isinstance(value, (list, tuple)):
        obj_id = id(value)
        if obj_id in seen:
            return "[Circular]"
        seen.add(obj_id)
        return [_redact(v, depth=depth - 1, seen=seen) for v in value]

    try:
        return str(value)
    except Exception:
        return "[Unserializable]"


class JsonFormatter(logging.Formatter):
    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "service": self.service_name,
            "message": record.getMessage(),
        }

        request_id = request_id_ctx.get()
        if request_id:
            payload["request_id"] = request_id

        correlation_id = correlation_id_ctx.get()
        if correlation_id:
            payload["correlation_id"] = correlation_id

        company_id = company_id_ctx.get()
        if company_id:
            payload["company_id"] = company_id

        if record.exc_info:
            payload["error"] = self.formatException(record.exc_info)

        extras: dict[str, Any] = {}

        if hasattr(record, "extra") and isinstance(record.extra, dict):
            extras.update(record.extra)

        for key, value in record.__dict__.items():
            if key in STANDARD_RECORD_ATTRS or key == "extra":
                continue
            extras[key] = value

        if extras:
            payload.update(_redact(extras))

        return json.dumps(payload, ensure_ascii=False)


def setup_logging(*, service_name: str = "agent-runtime", level: str | None = None) -> None:
    log_level = (level or os.getenv("LOG_LEVEL") or "INFO").upper()
    root = logging.getLogger()
    root.setLevel(log_level)

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter(service_name=service_name))

    root.handlers = [handler]
