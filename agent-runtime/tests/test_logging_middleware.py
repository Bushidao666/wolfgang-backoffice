import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

from common.infrastructure.metrics.prometheus import HTTP_REQUESTS_TOTAL
from common.middleware.logging import LoggingMiddleware


def _counter_value(*, method: str, path: str, status_code: str) -> float:
    # prometheus_client exposes internal value via `_value.get()`
    return float(HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status_code=status_code)._value.get())


def test_sets_request_and_correlation_headers_and_increments_metrics():
    app = FastAPI()
    app.add_middleware(LoggingMiddleware)

    @app.get("/hello")
    def hello():
        return {"ok": True}

    client = TestClient(app)

    before = _counter_value(method="GET", path="/hello", status_code="200")
    resp = client.get("/hello")
    after = _counter_value(method="GET", path="/hello", status_code="200")

    assert resp.status_code == 200
    assert "x-request-id" in resp.headers
    assert "x-correlation-id" in resp.headers
    assert resp.headers["x-request-id"] == resp.headers["x-correlation-id"]

    uuid.UUID(resp.headers["x-request-id"])
    assert after == before + 1


def test_honors_incoming_request_and_correlation_ids():
    app = FastAPI()
    app.add_middleware(LoggingMiddleware)

    @app.get("/hello")
    def hello():
        return {"ok": True}

    client = TestClient(app)

    before = _counter_value(method="GET", path="/hello", status_code="200")
    resp = client.get("/hello", headers={"x-request-id": "req-1", "x-correlation-id": "corr-1"})
    after = _counter_value(method="GET", path="/hello", status_code="200")

    assert resp.status_code == 200
    assert resp.headers["x-request-id"] == "req-1"
    assert resp.headers["x-correlation-id"] == "corr-1"
    assert after == before + 1

