import os

from fastapi import FastAPI

from common.infrastructure.tracing.tracer import init_tracing


def test_init_tracing_noops_when_disabled(monkeypatch):
    monkeypatch.setenv("OTEL_TRACING_ENABLED", "false")

    called = {"fastapi": False, "httpx": False}

    monkeypatch.setattr(
        "common.infrastructure.tracing.tracer.FastAPIInstrumentor.instrument_app",
        lambda *args, **kwargs: called.__setitem__("fastapi", True),
    )
    monkeypatch.setattr(
        "common.infrastructure.tracing.tracer.HTTPXClientInstrumentor.instrument",
        lambda *args, **kwargs: called.__setitem__("httpx", True),
    )

    init_tracing(FastAPI(), service_name="agent-runtime")
    assert called == {"fastapi": False, "httpx": False}


def test_init_tracing_instruments_fastapi_and_httpx(monkeypatch):
    monkeypatch.setenv("OTEL_TRACING_ENABLED", "true")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://example.test/v1/traces")

    called = {"fastapi": False, "httpx": False}

    monkeypatch.setattr(
        "common.infrastructure.tracing.tracer.FastAPIInstrumentor.instrument_app",
        lambda *args, **kwargs: called.__setitem__("fastapi", True),
    )
    monkeypatch.setattr(
        "common.infrastructure.tracing.tracer.HTTPXClientInstrumentor.instrument",
        lambda *args, **kwargs: called.__setitem__("httpx", True),
    )

    init_tracing(FastAPI(), service_name="agent-runtime")
    assert called == {"fastapi": True, "httpx": True}

