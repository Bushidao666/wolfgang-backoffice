import pytest

from modules.memory.services.memory_cleanup import MemoryCleanupWorker


class _Db:
    def __init__(self):
        self.execute_calls: list[str] = []
        self.fetch_calls: list[tuple[str, tuple]] = []
        self.next_fetch = []

    async def execute(self, query: str, *args):  # noqa: ARG002
        self.execute_calls.append(query)

    async def fetch(self, query: str, *args):
        self.fetch_calls.append((query, args))
        return self.next_fetch


class _Redis: ...


@pytest.mark.asyncio
async def test_memory_cleanup_runs_idempotency_cleanup():
    db = _Db()
    db.next_fetch = [{"id": "a"}, {"id": "b"}]
    worker = MemoryCleanupWorker(db=db, redis=_Redis())  # type: ignore[arg-type]

    await worker._cleanup()  # noqa: SLF001

    assert db.execute_calls
    assert db.fetch_calls

