import json
import logging

import pytest

from common.config.logging import JsonFormatter, _redact, company_id_ctx, correlation_id_ctx, request_id_ctx, setup_logging


def test_redact_masks_sensitive_keys_and_handles_cycles():
    data: dict[str, object] = {"password": "secret", "nested": {"token": "t"}, "ok": True}
    data["self"] = data

    out = _redact(data)
    assert out["password"] == "[REDACTED]"
    assert out["nested"]["token"] == "[REDACTED]"
    assert out["self"] == "[Circular]"


def test_json_formatter_includes_context_and_redacts_extras():
    formatter = JsonFormatter(service_name="agent-runtime")

    token_req = request_id_ctx.set("req-1")
    token_corr = correlation_id_ctx.set("corr-1")
    token_company = company_id_ctx.set("co-1")
    try:
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello",
            args=(),
            exc_info=None,
        )
        record.extra = {"password": "secret", "count": 2, "nested": {"api_key": "k"}}
        record.user_id = "u1"

        payload = json.loads(formatter.format(record))
        assert payload["service"] == "agent-runtime"
        assert payload["message"] == "hello"
        assert payload["request_id"] == "req-1"
        assert payload["correlation_id"] == "corr-1"
        assert payload["company_id"] == "co-1"
        assert payload["password"] == "[REDACTED]"
        assert payload["nested"]["api_key"] == "[REDACTED]"
        assert payload["user_id"] == "u1"
        assert payload["count"] == 2
    finally:
        request_id_ctx.reset(token_req)
        correlation_id_ctx.reset(token_corr)
        company_id_ctx.reset(token_company)


def test_setup_logging_configures_root_logger():
    root = logging.getLogger()
    prev_level = root.level
    prev_handlers = list(root.handlers)
    try:
        setup_logging(service_name="agent-runtime", level="DEBUG")
        assert root.level == logging.DEBUG
        assert len(root.handlers) == 1
        assert isinstance(root.handlers[0].formatter, JsonFormatter)
    finally:
        root.handlers = prev_handlers
        root.setLevel(prev_level)

