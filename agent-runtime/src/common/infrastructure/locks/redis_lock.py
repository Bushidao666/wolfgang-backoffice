from __future__ import annotations

import asyncio
import uuid
from contextlib import asynccontextmanager

from common.infrastructure.cache.redis_client import RedisClient


_RELEASE_LUA = """
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
"""

_REFRESH_LUA = """
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], tonumber(ARGV[2]))
end
return 0
"""


class RedisLockManager:
    def __init__(self, redis: RedisClient, *, prefix: str = "locks:"):
        self._redis = redis
        self._prefix = prefix

    def _key(self, name: str) -> str:
        name = str(name).strip()
        if not name:
            raise ValueError("Lock name is required")
        return f"{self._prefix}{name}"

    async def acquire(self, name: str, *, ttl_s: int) -> str | None:
        ttl_s = max(1, int(ttl_s))
        key = self._key(name)
        token = str(uuid.uuid4())
        ok = await self._redis.client.set(key, token, ex=ttl_s, nx=True)
        return token if ok else None

    async def release(self, name: str, *, token: str) -> bool:
        key = self._key(name)
        res = await self._redis.client.eval(_RELEASE_LUA, 1, key, token)
        return bool(res)

    async def refresh(self, name: str, *, token: str, ttl_s: int) -> bool:
        ttl_s = max(1, int(ttl_s))
        key = self._key(name)
        res = await self._redis.client.eval(_REFRESH_LUA, 1, key, token, str(ttl_s))
        return bool(res)

    @asynccontextmanager
    async def hold(
        self,
        name: str,
        *,
        ttl_s: int,
        refresh_every_s: float | None = None,
    ):
        """
        Context manager that acquires a lock and (optionally) keeps renewing it.
        Yields `True` when acquired, `False` when not acquired.
        """
        token = await self.acquire(name, ttl_s=ttl_s)
        if not token:
            yield False
            return

        stop = asyncio.Event()

        async def _refresher():
            if not refresh_every_s or refresh_every_s <= 0:
                return
            while not stop.is_set():
                try:
                    await asyncio.sleep(refresh_every_s)
                    if stop.is_set():
                        break
                    await self.refresh(name, token=token, ttl_s=ttl_s)
                except Exception:
                    # Never crash the caller because refresh failed; TTL still protects us.
                    continue

        task = asyncio.create_task(_refresher())
        try:
            yield True
        finally:
            stop.set()
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            except Exception:
                pass
            try:
                await self.release(name, token=token)
            except Exception:
                # If release fails, TTL will eventually expire.
                pass
