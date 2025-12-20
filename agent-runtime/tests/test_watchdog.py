import types

import pytest

from modules.centurion.jobs.conversation_watchdog import ConversationWatchdog


class _Db:
    def __init__(self, rows):
        self.rows = rows
        self.fetch_calls = []
        self.execute_calls = []

    async def fetch(self, query: str, *args):
        self.fetch_calls.append((query, args))
        return self.rows

    async def execute(self, query: str, *args):
        self.execute_calls.append((query, args))


@pytest.mark.asyncio
async def test_watchdog_tick_recovers_processing_conversations(monkeypatch):
    monkeypatch.setattr(
        "modules.centurion.jobs.conversation_watchdog.get_settings",
        lambda: types.SimpleNamespace(watchdog_stuck_after_s=10, watchdog_batch_size=5),
    )

    db = _Db(
        [
            {"id": "c1", "pending_messages": ["hello"]},
            {"id": "c2", "pending_messages": []},
            {"id": "", "pending_messages": ["ignored"]},
        ]
    )
    watchdog = ConversationWatchdog(db=db)  # type: ignore[arg-type]
    await watchdog._tick()  # noqa: SLF001

    assert db.fetch_calls
    assert db.fetch_calls[0][1] == (10, 5)

    executed_ids = [args[0] for _, args in db.execute_calls]
    assert executed_ids == ["c1", "c2"]
