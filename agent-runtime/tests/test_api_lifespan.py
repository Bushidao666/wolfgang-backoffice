from __future__ import annotations

import types

import pytest
from fastapi import FastAPI

import api.main as api_main


class _FakePool:
    def __init__(self, dsn: str, *, min_size: int, max_size: int):  # noqa: ARG002
        self.started = False
        self.closed = False

    async def start(self):
        self.started = True

    async def close(self):
        self.closed = True


class _FakeRedis:
    def __init__(self, url: str):  # noqa: ARG002
        self.connected = False
        self.closed = False

    async def connect(self):
        self.connected = True

    async def close(self):
        self.closed = True


class _FakePubSub:
    def __init__(self, redis):  # noqa: ARG002
        self.registered: list[str] = []
        self.closed = False

    def register(self, channel: str, handler):  # noqa: ARG002
        self.registered.append(channel)

    async def close(self):
        self.closed = True


class _DummyWorker:
    def __init__(self, *args, **kwargs):  # noqa: ARG002
        pass

    async def handle_message_received(self, raw: str):  # noqa: ARG002
        return None

    async def run_forever(self):
        return None


@pytest.mark.asyncio
async def test_lifespan_short_circuits_when_connections_disabled(monkeypatch):
    settings = types.SimpleNamespace(
        environment="test",
        log_level="INFO",
        disable_connections=True,
        disable_workers=True,
        supabase_db_url="postgres://example",
        db_pool_min=1,
        db_pool_max=2,
        redis_url="redis://example",
    )
    monkeypatch.setattr(api_main, "get_settings", lambda: settings)
    monkeypatch.setattr(api_main, "setup_logging", lambda *a, **k: None)
    monkeypatch.setattr(api_main, "init_tracing", lambda *a, **k: None)

    app = FastAPI()
    async with api_main.lifespan(app):
        assert app.state.disable_connections is True
        assert app.state.settings is settings


@pytest.mark.asyncio
async def test_lifespan_initializes_and_closes_resources(monkeypatch):
    settings = types.SimpleNamespace(
        environment="test",
        log_level="INFO",
        disable_connections=False,
        disable_workers=True,
        supabase_db_url="postgres://example",
        db_pool_min=1,
        db_pool_max=2,
        redis_url="redis://example",
    )
    monkeypatch.setattr(api_main, "get_settings", lambda: settings)
    monkeypatch.setattr(api_main, "setup_logging", lambda *a, **k: None)
    monkeypatch.setattr(api_main, "init_tracing", lambda *a, **k: None)
    monkeypatch.setattr(api_main, "ConnectionPool", _FakePool)
    monkeypatch.setattr(api_main, "SupabaseDb", lambda pool: types.SimpleNamespace(fetchrow=lambda *a, **k: {"ok": 1}))  # noqa: ARG005
    monkeypatch.setattr(api_main, "RedisClient", _FakeRedis)
    monkeypatch.setattr(api_main, "RedisPubSubSubscriber", _FakePubSub)
    monkeypatch.setattr(api_main, "MessageHandler", _DummyWorker)
    monkeypatch.setattr(api_main, "DebounceWorker", _DummyWorker)
    monkeypatch.setattr(api_main, "ProactiveHandler", _DummyWorker)
    monkeypatch.setattr(api_main, "MemoryCleanupWorker", _DummyWorker)

    app = FastAPI()
    async with api_main.lifespan(app):
        assert app.state.disable_connections is False
        assert app.state.pool.started is True
        assert app.state.redis.connected is True

    assert app.state.pool.closed is True
    assert app.state.redis.closed is True
