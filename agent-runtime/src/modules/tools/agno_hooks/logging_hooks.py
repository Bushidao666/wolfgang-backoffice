from __future__ import annotations

import inspect
import logging
import time
from typing import Any, Callable

from common.config.logging import _redact
from common.security.payload_limits import PayloadLimits

logger = logging.getLogger(__name__)

_LIMITS = PayloadLimits.from_env()


async def tool_logging_hook(function_name: str, function_call: Callable[..., Any], arguments: dict[str, Any]) -> Any:
    start = time.monotonic()
    safe_args = _redact(_LIMITS.truncate_tool_result(arguments))

    logger.info(
        "tool.call.started",
        extra={"extra": {"tool_name": function_name, "arguments": safe_args}},
    )

    try:
        result = function_call(**arguments)
        if inspect.isawaitable(result):
            result = await result
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.exception(
            "tool.call.failed",
            extra={"extra": {"tool_name": function_name, "duration_ms": duration_ms, "error": str(exc)}},
        )
        raise

    duration_ms = int((time.monotonic() - start) * 1000)
    safe_result = _redact(_LIMITS.truncate_tool_result(result))

    logger.info(
        "tool.call.completed",
        extra={"extra": {"tool_name": function_name, "duration_ms": duration_ms, "result": safe_result}},
    )
    return result

