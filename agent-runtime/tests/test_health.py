def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_ready_when_connections_disabled(client):
    resp = client.get("/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["ready"] is True
    assert body["checks"]["connections"] == "disabled"


def test_metrics_endpoint_exposes_prometheus(client):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    assert "text/plain" in (resp.headers.get("content-type") or "")
    assert b"http_requests_total" in resp.content
