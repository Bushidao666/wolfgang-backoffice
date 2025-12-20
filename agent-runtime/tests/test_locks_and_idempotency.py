import asyncio

import pytest

from common.infrastructure.idempotency.idempotency_store import IdempotencyStore
from common.infrastructure.locks.redis_lock import RedisLockManager, _REFRESH_LUA, _RELEASE_LUA


class _FakeRedisInner:
    def __init__(self):
        self.store: dict[str, str] = {}
        self.set_calls: list[tuple[str, str, int | None, bool]] = []
        self.eval_calls: list[tuple[str, tuple]] = []

    async def set(self, key: str, value: str, *, ex: int | None = None, nx: bool = False):
        self.set_calls.append((key, value, ex, nx))
        if nx and key in self.store:
            return None
        self.store[key] = value
        return True

    async def eval(self, script: str, num_keys: int, key: str, token: str, *args):  # noqa: ARG002
        self.eval_calls.append((script, (num_keys, key, token, *args)))
        if script == _RELEASE_LUA:
            if self.store.get(key) == token:
                del self.store[key]
                return 1
            return 0
        if script == _REFRESH_LUA:
            return 1 if self.store.get(key) == token else 0
        raise AssertionError("Unexpected Lua script")


class _FakeRedisClient:
    def __init__(self):
        self.client = _FakeRedisInner()


@pytest.mark.asyncio
async def test_redis_lock_acquire_release_refresh_roundtrip():
    redis = _FakeRedisClient()
    locks = RedisLockManager(redis, prefix="t:")

    token = await locks.acquire("a", ttl_s=10)
    assert token

    token2 = await locks.acquire("a", ttl_s=10)
    assert token2 is None

    assert await locks.refresh("a", token=token, ttl_s=10) is True
    assert await locks.refresh("a", token="wrong", ttl_s=10) is False

    assert await locks.release("a", token=token) is True
    assert await locks.release("a", token=token) is False


@pytest.mark.asyncio
async def test_redis_lock_hold_yields_false_when_not_acquired():
    redis = _FakeRedisClient()
    locks = RedisLockManager(redis, prefix="t:")

    redis.client.store["t:busy"] = "someone-else"

    async with locks.hold("busy", ttl_s=5) as acquired:
        assert acquired is False


@pytest.mark.asyncio
async def test_redis_lock_hold_refreshes_and_releases():
    redis = _FakeRedisClient()
    locks = RedisLockManager(redis, prefix="t:")

    async with locks.hold("x", ttl_s=5, refresh_every_s=0.01) as acquired:
        assert acquired is True
        await asyncio.sleep(0.03)

    key = "t:x"
    assert key not in redis.client.store
    assert any(call[0] == _REFRESH_LUA for call in redis.client.eval_calls)
    assert any(call[0] == _RELEASE_LUA for call in redis.client.eval_calls)


@pytest.mark.asyncio
async def test_redis_lock_requires_name():
    redis = _FakeRedisClient()
    locks = RedisLockManager(redis, prefix="t:")

    with pytest.raises(ValueError):
        await locks.acquire("", ttl_s=5)


class _FakeDb:
    def __init__(self):
        self.fetchrow_calls: list[tuple[str, tuple]] = []
        self.execute_calls: list[tuple[str, tuple]] = []
        self.fetch_calls: list[tuple[str, tuple]] = []
        self.next_fetchrow = None
        self.next_fetch = []

    async def fetchrow(self, query: str, *args):
        self.fetchrow_calls.append((query, args))
        return self.next_fetchrow

    async def execute(self, query: str, *args):
        self.execute_calls.append((query, args))

    async def fetch(self, query: str, *args):
        self.fetch_calls.append((query, args))
        return self.next_fetch


@pytest.mark.asyncio
async def test_idempotency_claim_release_cleanup():
    db = _FakeDb()
    store = IdempotencyStore(db)  # type: ignore[arg-type]

    long_key = "k" * 600
    db.next_fetchrow = {"id": "row1"}
    claimed = await store.claim(
        company_id="co1",
        consumer="c",
        key=long_key,
        ttl_seconds=1,
        event_type="message.received",
        event_id="evt123456",
        correlation_id="corr12345",
        causation_id=None,
        metadata={"webhook_secret": "dont-log-me"},
    )
    assert claimed is True
    assert db.fetchrow_calls
    _, args = db.fetchrow_calls[-1]
    assert len(args[2]) == 512  # dedupe_key truncation
    assert args[-1] == 30  # ttl_seconds min
    assert isinstance(args[8], str) and len(args[8]) == 64  # payload_hash

    db.next_fetchrow = None
    claimed2 = await store.claim(company_id="co1", consumer="c", key=long_key, ttl_seconds=30)
    assert claimed2 is False

    await store.release(company_id="co1", consumer="c", key=long_key)
    assert db.execute_calls

    db.next_fetch = [{"id": "a"}, {"id": "b"}, {"id": "c"}]
    deleted = await store.cleanup_expired(limit=0)
    assert deleted == 3
    assert db.fetch_calls[-1][1][0] == 1
