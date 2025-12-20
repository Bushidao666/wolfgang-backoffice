from __future__ import annotations

import inspect
import logging
from typing import Any, Awaitable, Callable

from common.security.payload_limits import PayloadLimits

logger = logging.getLogger(__name__)

_LIMITS = PayloadLimits.from_env()


async def payload_limits_hook(function_name: str, function_call: Callable[..., Any], arguments: dict[str, Any]) -> Any:
    """
    Enforce payload limits for tool calls and keep tool outputs bounded.

    - Rejects overly large tool arguments (prevents oversized HTTP bodies / prompt stuffing)
    - Truncates tool results before returning them to the model (avoids memory/log blowups)
    """
    _LIMITS.ensure_tool_args(arguments, tool_name=function_name)

    result = function_call(**arguments)
    if inspect.isawaitable(result):
        result = await result  # type: ignore[assignment]

    return _LIMITS.truncate_tool_result(result)

