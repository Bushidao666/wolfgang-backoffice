import types

import pytest

from common.infrastructure.database.connection_pool import ConnectionPool
from common.infrastructure.database.supabase_client import SupabaseDb


class _FakeAsyncpgPool:
    def __init__(self):
        self.closed = False

    async def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_connection_pool_start_and_close(monkeypatch):
    created: list[dict[str, object]] = []

    async def fake_create_pool(*, dsn: str, min_size: int, max_size: int):  # noqa: ARG001
        created.append({"dsn": dsn, "min_size": min_size, "max_size": max_size})
        return _FakeAsyncpgPool()

    monkeypatch.setattr("common.infrastructure.database.connection_pool.asyncpg.create_pool", fake_create_pool)

    pool = ConnectionPool("postgres://example", min_size=2, max_size=3)
    with pytest.raises(RuntimeError):
        _ = pool.pool

    await pool.start()
    assert created == [{"dsn": "postgres://example", "min_size": 2, "max_size": 3}]
    assert pool.pool is not None

    await pool.start()
    assert len(created) == 1

    await pool.close()
    with pytest.raises(RuntimeError):
        _ = pool.pool


class _Acquire:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, exc_type, exc, tb):  # noqa: ARG002
        return False


class _Tx:
    async def __aenter__(self):
        return None

    async def __aexit__(self, exc_type, exc, tb):  # noqa: ARG002
        return False


@pytest.mark.asyncio
async def test_supabase_db_proxies_queries():
    calls: list[tuple[str, tuple[object, ...]]] = []

    async def fetchrow(query: str, *args):
        calls.append(("fetchrow", (query, *args)))
        return {"ok": 1}

    async def fetch(query: str, *args):
        calls.append(("fetch", (query, *args)))
        return [{"id": 1}]

    async def execute(query: str, *args):
        calls.append(("execute", (query, *args)))
        return "OK"

    fake_conn = types.SimpleNamespace(fetchrow=fetchrow, fetch=fetch, execute=execute, transaction=lambda: _Tx())
    fake_pool = types.SimpleNamespace(acquire=lambda: _Acquire(fake_conn))
    pool = types.SimpleNamespace(pool=fake_pool)

    db = SupabaseDb(pool)  # type: ignore[arg-type]
    assert await db.fetchrow("select 1", 1) == {"ok": 1}
    assert await db.fetch("select *", 2) == [{"id": 1}]
    assert await db.execute("update", 3) == "OK"

    async with db.transaction() as conn:
        assert conn is fake_conn

    assert [c[0] for c in calls] == ["fetchrow", "fetch", "execute"]

