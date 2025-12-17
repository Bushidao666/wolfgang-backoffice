import types

from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.routes.centurions as centurions_route


def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(centurions_route.router)
    return app


def test_test_centurion_returns_503_when_connections_disabled():
    app = _make_app()
    app.state.disable_connections = True
    client = TestClient(app)

    resp = client.post("/centurions/c1/test", json={"company_id": "co1", "message": "oi"})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "connections disabled"


def test_test_centurion_returns_503_when_service_not_ready():
    app = _make_app()
    app.state.disable_connections = False
    client = TestClient(app)

    resp = client.post("/centurions/c1/test", json={"company_id": "co1", "message": "oi"})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "service not ready"


def test_test_centurion_validates_payload():
    app = _make_app()
    app.state.disable_connections = False
    app.state.db = object()
    app.state.redis = object()
    client = TestClient(app)

    resp = client.post("/centurions/c1/test", json={"company_id": "", "message": ""})
    assert resp.status_code == 422


def test_test_centurion_happy_path(monkeypatch):
    class FakeCenturionService:
        def __init__(self, *, db, redis):
            self._db = db
            self._redis = redis

        async def test_centurion(self, *, company_id: str, centurion_id: str, message: str):
            return {"ok": True, "company_id": company_id, "centurion_id": centurion_id, "echo": message}

    monkeypatch.setattr(centurions_route, "CenturionService", FakeCenturionService)

    app = _make_app()
    app.state.disable_connections = False
    app.state.db = types.SimpleNamespace()
    app.state.redis = types.SimpleNamespace()
    client = TestClient(app)

    resp = client.post("/centurions/ct1/test", json={"company_id": "co1", "message": "oi"})
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    assert resp.json()["centurion_id"] == "ct1"
    assert resp.json()["company_id"] == "co1"
    assert resp.json()["echo"] == "oi"


def test_test_centurion_maps_value_error_to_404(monkeypatch):
    class FakeCenturionService:
        def __init__(self, *, db, redis):
            pass

        async def test_centurion(self, *, company_id: str, centurion_id: str, message: str):
            raise ValueError("Centurion not found")

    monkeypatch.setattr(centurions_route, "CenturionService", FakeCenturionService)

    app = _make_app()
    app.state.disable_connections = False
    app.state.db = object()
    app.state.redis = object()
    client = TestClient(app)

    resp = client.post("/centurions/ct1/test", json={"company_id": "co1", "message": "oi"})
    assert resp.status_code == 404
    assert "Centurion not found" in resp.json()["detail"]

