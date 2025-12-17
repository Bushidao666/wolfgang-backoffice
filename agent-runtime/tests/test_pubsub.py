from __future__ import annotations

import asyncio

import pytest

from common.infrastructure.messaging.pubsub import RedisPubSubSubscriber


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


class _FakeRedisClient:
    def __init__(self, pubsub: _FakePubSub):
        self._pubsub = pubsub

    def pubsub(self):
        return self._pubsub


class _FakeRedis:
    def __init__(self, pubsub: _FakePubSub):
        self.client = _FakeRedisClient(pubsub)


@pytest.mark.asyncio
async def test_pubsub_run_forever_no_handlers_waits_forever(caplog):
    sub = RedisPubSubSubscriber(_FakeRedis(_FakePubSub([])))  # type: ignore[arg-type]

    task = asyncio.create_task(sub.run_forever())
    await asyncio.sleep(0)  # allow task to start

    assert any("pubsub.no_handlers" in r.getMessage() for r in caplog.records)

    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task


@pytest.mark.asyncio
async def test_pubsub_dispatches_messages_to_handler():
    messages = [
        {"type": "subscribe"},
        {"type": "message", "channel": "c1", "data": "hello"},
        {"type": "message", "channel": "c1", "data": None},
        {"type": "message", "channel": 123, "data": "ignored"},
    ]
    pubsub = _FakePubSub(messages)
    sub = RedisPubSubSubscriber(_FakeRedis(pubsub))  # type: ignore[arg-type]

    seen: list[str] = []

    async def handler(data: str):
        seen.append(data)

    sub.register("c1", handler)
    await sub.run_forever()

    assert pubsub.subscribed == ["c1"]
    assert seen == ["hello"]

