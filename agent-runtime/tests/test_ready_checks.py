from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.health import router as health_router


class _OkDb:
    async def fetchrow(self, query: str, *args):
        return {"ok": 1}


class _FailDb:
    async def fetchrow(self, query: str, *args):
        raise RuntimeError("db down")


class _RedisClientOk:
    async def ping(self):
        return True


class _RedisOk:
    client = _RedisClientOk()


class _RedisFailClient:
    async def ping(self):
        raise RuntimeError("redis down")


class _RedisFail:
    client = _RedisFailClient()


def test_ready_returns_ok_when_connections_disabled():
    app = FastAPI()
    app.include_router(health_router)
    app.state.disable_connections = True

    client = TestClient(app)
    resp = client.get("/ready")

    assert resp.status_code == 200
    body = resp.json()
    assert body["ready"] is True
    assert body["checks"]["connections"] == "disabled"


def test_ready_returns_degraded_when_dependencies_missing():
    app = FastAPI()
    app.include_router(health_router)

    client = TestClient(app)
    resp = client.get("/ready")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["ready"] is False
    assert body["checks"]["db"] == "failed"
    assert body["checks"]["redis"] == "failed"


def test_ready_returns_ok_when_db_and_redis_ok():
    app = FastAPI()
    app.include_router(health_router)
    app.state.disable_connections = False
    app.state.db = _OkDb()
    app.state.redis = _RedisOk()

    client = TestClient(app)
    resp = client.get("/ready")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["ready"] is True
    assert body["checks"]["db"] == "ok"
    assert body["checks"]["redis"] == "ok"


def test_ready_returns_degraded_when_db_or_redis_fails():
    app = FastAPI()
    app.include_router(health_router)
    app.state.disable_connections = False
    app.state.db = _FailDb()
    app.state.redis = _RedisFail()

    client = TestClient(app)
    resp = client.get("/ready")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["ready"] is False
    assert body["checks"]["db"] == "failed"
    assert body["checks"]["redis"] == "failed"

