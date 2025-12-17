import asyncio

import pytest

from common.infrastructure.cache.redis_client import RedisClient


class _FakePubSub:
    def __init__(self, messages):
        self._messages = list(messages)
        self.subscribed: list[str] = []
        self.closed = False

    async def subscribe(self, *channels: str):
        self.subscribed.extend(channels)

    async def listen(self):
        for msg in self._messages:
            yield msg

    async def close(self):
        self.closed = True


class _FakeRedis:
    def __init__(self, pubsub: _FakePubSub | None = None):
        self._kv: dict[str, str] = {}
        self._pubsub = pubsub or _FakePubSub([])
        self.pinged = False
        self.closed = False
        self.published: list[tuple[str, str]] = []

    async def ping(self):
        self.pinged = True
        return True

    async def close(self):
        self.closed = True

    async def get(self, key: str):
        return self._kv.get(key)

    async def set(self, key: str, value: str, ex: int | None = None):  # noqa: ARG002
        self._kv[key] = value

    async def delete(self, key: str):
        self._kv.pop(key, None)

    async def publish(self, channel: str, message: str):
        self.published.append((channel, message))

    def pubsub(self):
        return self._pubsub


@pytest.mark.asyncio
async def test_redis_client_connect_get_set_delete_close(monkeypatch):
    fake = _FakeRedis()
    created: list[str] = []

    def fake_from_url(url: str, decode_responses: bool = True):  # noqa: ARG001
        created.append(url)
        return fake

    monkeypatch.setattr("common.infrastructure.cache.redis_client.redis.from_url", fake_from_url)

    client = RedisClient("redis://example")
    await client.connect()
    assert created == ["redis://example"]
    assert fake.pinged is True

    await client.set("k", "v", ttl_s=1)
    assert await client.get("k") == "v"

    await client.delete("k")
    assert await client.get("k") is None

    await client.close()
    assert fake.closed is True


@pytest.mark.asyncio
async def test_redis_client_subscribe_invokes_handler(monkeypatch):
    messages = [
        {"type": "subscribe", "data": None},
        {"type": "message", "data": "hello"},
        {"type": "message", "data": 123},
        {"type": "message", "data": "world"},
    ]
    pubsub = _FakePubSub(messages)
    fake = _FakeRedis(pubsub=pubsub)

    monkeypatch.setattr("common.infrastructure.cache.redis_client.redis.from_url", lambda url, decode_responses=True: fake)  # noqa: ARG005

    client = RedisClient("redis://example")
    await client.connect()

    seen: list[str] = []

    async def handler(data: str):
        seen.append(data)

    pubsub_obj, run = await client.subscribe("chan", handler)
    assert pubsub_obj is pubsub
    assert pubsub.subscribed == ["chan"]

    await asyncio.wait_for(run(), timeout=1.0)
    assert seen == ["hello", "world"]

