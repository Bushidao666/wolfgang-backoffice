from __future__ import annotations

import inspect
import json
import logging
import time
from typing import Any, Callable

from common.config.logging import _redact, company_id_ctx, correlation_id_ctx, request_id_ctx
from common.infrastructure.database.supabase_client import SupabaseDb
from common.security.payload_limits import PayloadLimits

logger = logging.getLogger(__name__)


def make_tool_audit_hook(*, db: SupabaseDb) -> Callable[..., Any]:
    limits = PayloadLimits.from_env()

    async def _hook(function_name: str, function_call: Callable[..., Any], arguments: dict[str, Any], agent=None) -> Any:  # noqa: ANN001
        start = time.monotonic()

        result: Any = None
        ok = False
        error: str | None = None

        try:
            out = function_call(**arguments)
            if inspect.isawaitable(out):
                out = await out
            result = out
            ok = True
            return out
        except Exception as exc:
            error = str(exc)
            raise
        finally:
            company_id = company_id_ctx.get()
            if not company_id:
                # No company context; skip auditing without affecting the tool result.
                pass
            else:
                duration_ms = int((time.monotonic() - start) * 1000)
                req_id = request_id_ctx.get()
                corr_id = correlation_id_ctx.get()

                safe_args = _redact(limits.truncate_tool_result(arguments))
                safe_result = _redact(limits.truncate_tool_result(result))

                metadata = {
                    "tool_name": function_name,
                    "ok": ok,
                    "duration_ms": duration_ms,
                    "arguments": safe_args,
                    "result": safe_result,
                    "error": error,
                    "centurion_id": getattr(agent, "id", None) if agent else None,
                    "conversation_id": getattr(agent, "session_id", None) if agent else None,
                    "user_id": getattr(agent, "user_id", None) if agent else None,
                }

                try:
                    await db.execute(
                        """
                        insert into core.audit_logs (
                          company_id,
                          actor_role,
                          action,
                          entity_type,
                          entity_id,
                          request_id,
                          correlation_id,
                          metadata
                        )
                        values ($1::uuid, $2, $3, $4, $5::uuid, $6, $7, $8::jsonb)
                        """,
                        company_id,
                        "agent-runtime",
                        "tool.call",
                        "tool",
                        None,
                        req_id,
                        corr_id,
                        json.dumps(metadata, ensure_ascii=False),
                    )
                except Exception:
                    logger.exception("tool.audit_failed", extra={"extra": {"tool_name": function_name}})

    return _hook
