import asyncio
import types

import pytest

from modules.memory.services.memory_cleanup import MemoryCleanupWorker


class _Db:
    def __init__(self):
        self.executed: list[str] = []

    async def execute(self, query: str, *args):  # noqa: ARG002
        self.executed.append(query)
        return "OK"


@pytest.mark.asyncio
async def test_cleanup_executes_archive_query():
    db = _Db()
    worker = MemoryCleanupWorker(db=db, redis=object())  # type: ignore[arg-type]

    await worker._cleanup()  # noqa: SLF001
    assert db.executed
    assert "update core.messages" in db.executed[0]


@pytest.mark.asyncio
async def test_cleanup_worker_runs_once_and_can_be_cancelled(monkeypatch):
    db = _Db()
    worker = MemoryCleanupWorker(db=db, redis=object())  # type: ignore[arg-type]

    monkeypatch.setattr("modules.memory.services.memory_cleanup.get_settings", lambda: types.SimpleNamespace(cleanup_interval_s=0.0))

    async def stop_sleep(seconds: float):  # noqa: ARG001
        raise asyncio.CancelledError()

    monkeypatch.setattr("modules.memory.services.memory_cleanup.asyncio.sleep", stop_sleep)

    with pytest.raises(asyncio.CancelledError):
        await worker.run_forever()

    assert db.executed

