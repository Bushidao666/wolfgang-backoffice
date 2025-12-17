import asyncio
import types

import pytest

from handlers.proactive_handler import ProactiveHandler


@pytest.mark.asyncio
async def test_proactive_handler_runs_ticks_until_cancelled(monkeypatch):
    handler = ProactiveHandler(db=object(), redis=object())  # type: ignore[arg-type]

    called = {"count": 0}

    async def process_due(limit: int = 20):  # noqa: ARG001
        called["count"] += 1
        return 1

    handler._followups = types.SimpleNamespace(process_due=process_due)  # type: ignore[attr-defined]

    monkeypatch.setattr("handlers.proactive_handler.get_settings", lambda: types.SimpleNamespace(followup_poll_interval_s=0.0))

    async def stop_sleep(seconds: float):  # noqa: ARG001
        raise asyncio.CancelledError()

    monkeypatch.setattr("handlers.proactive_handler.asyncio.sleep", stop_sleep)

    with pytest.raises(asyncio.CancelledError):
        await handler.run_forever()

    assert called["count"] == 1

