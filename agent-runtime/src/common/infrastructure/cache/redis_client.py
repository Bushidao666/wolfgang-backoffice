import json
from typing import Any, Callable, Awaitable

import redis.asyncio as redis


class RedisClient:
    def __init__(self, url: str):
        self._url = url
        self._client: redis.Redis | None = None

    async def connect(self) -> None:
        if self._client:
            return
        self._client = redis.from_url(self._url, decode_responses=True)
        await self._client.ping()

    @property
    def client(self) -> redis.Redis:
        if not self._client:
            raise RuntimeError("RedisClient not connected")
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None

    async def get(self, key: str) -> str | None:
        return await self.client.get(key)

    async def set(self, key: str, value: str, *, ttl_s: int | None = None) -> None:
        if ttl_s:
            await self.client.set(key, value, ex=ttl_s)
        else:
            await self.client.set(key, value)

    async def delete(self, key: str) -> None:
        await self.client.delete(key)

    async def get_json(self, key: str) -> Any | None:
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    async def set_json(self, key: str, value: Any, *, ttl_s: int | None = None) -> None:
        await self.set(key, json.dumps(value, ensure_ascii=False), ttl_s=ttl_s)

    async def publish(self, channel: str, message: str) -> None:
        await self.client.publish(channel, message)

    async def subscribe(self, channel: str, handler: Callable[[str], Awaitable[None]]):
        pubsub = self.client.pubsub()
        await pubsub.subscribe(channel)

        async def _run():
            async for msg in pubsub.listen():
                if msg is None or msg.get("type") != "message":
                    continue
                data = msg.get("data")
                if isinstance(data, str):
                    await handler(data)

        return pubsub, _run

