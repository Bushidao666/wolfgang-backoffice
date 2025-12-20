import pytest

from common.config.logging import company_id_ctx, correlation_id_ctx, request_id_ctx
from modules.tools.agno_hooks.audit_hooks import make_tool_audit_hook
from modules.tools.agno_hooks.logging_hooks import tool_logging_hook
from modules.tools.agno_hooks.security_hooks import payload_limits_hook


class _Db:
    def __init__(self):
        self.calls: list[tuple[str, tuple]] = []

    async def execute(self, query: str, *args):
        self.calls.append((query, args))
        return "OK"


@pytest.mark.asyncio
async def test_payload_limits_hook_allows_small_args():
    async def fn(**kwargs):  # noqa: ANN003
        return {"ok": True, "echo": kwargs}

    out = await payload_limits_hook("t", fn, {"x": "y"})
    assert out["ok"] is True


@pytest.mark.asyncio
async def test_payload_limits_hook_rejects_large_args():
    async def fn(**kwargs):  # noqa: ANN003
        return kwargs

    with pytest.raises(ValueError):
        await payload_limits_hook("t", fn, {"x": "a" * 30_000})


@pytest.mark.asyncio
async def test_tool_logging_hook_returns_result():
    async def fn(**kwargs):  # noqa: ANN003
        return {"ok": True, "x": kwargs.get("x")}

    out = await tool_logging_hook("t", fn, {"x": 1})
    assert out == {"ok": True, "x": 1}


@pytest.mark.asyncio
async def test_audit_hook_skips_when_company_context_missing():
    db = _Db()
    hook = make_tool_audit_hook(db=db)  # type: ignore[arg-type]

    async def fn(**kwargs):  # noqa: ANN003
        return {"ok": True}

    out = await hook("t", fn, {"x": 1})
    assert out == {"ok": True}
    assert db.calls == []


@pytest.mark.asyncio
async def test_audit_hook_records_even_on_error():
    db = _Db()
    hook = make_tool_audit_hook(db=db)  # type: ignore[arg-type]

    token_company = company_id_ctx.set("00000000-0000-0000-0000-000000000000")
    token_req = request_id_ctx.set("req-1")
    token_corr = correlation_id_ctx.set("corr-1")

    async def fn(**kwargs):  # noqa: ANN003
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError):
        await hook("t", fn, {"x": 1}, agent=type("A", (), {"id": "ct1", "session_id": "c1", "user_id": "u1"})())

    company_id_ctx.reset(token_company)
    request_id_ctx.reset(token_req)
    correlation_id_ctx.reset(token_corr)

    assert db.calls

