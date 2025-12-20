import base64

import httpx
import pytest

from common.security.egress_policy import EgressPolicy
from modules.tools.domain.tool import ToolConfig
from modules.tools.services.tool_executor import ToolExecutionError, ToolExecutor


def _tool(**overrides) -> ToolConfig:
    base = ToolConfig(
        id="t1",
        company_id="co1",
        centurion_id="ct1",
        tool_name="Tool 1",
        description=None,
        endpoint="https://example.test/tool",
        method="POST",
        headers={},
        auth_type=None,
        auth_config={},
        input_schema={},
        output_schema=None,
        timeout_ms=1000,
        retry_count=1,
        is_active=True,
    )
    return ToolConfig(**{**base.__dict__, **overrides})


def test_build_headers_supports_bearer_and_api_key_and_basic():
    executor = ToolExecutor(egress_policy=EgressPolicy(block_private_networks=False))

    tool = _tool(auth_type="bearer", auth_config={"token": "abc"})
    headers = executor._build_headers(tool, params={})
    assert headers["Authorization"] == "Bearer abc"

    tool2 = _tool(auth_type="api_key", auth_config={"key": "k1"})
    headers2 = executor._build_headers(tool2, params={})
    assert headers2["x-api-key"] == "k1"

    tool3 = _tool(auth_type="api_key", auth_config={"header_name": "x-custom", "key": "k2"})
    headers3 = executor._build_headers(tool3, params={})
    assert headers3["x-custom"] == "k2"

    tool4 = _tool(auth_type="basic", auth_config={"username": "u", "password": "p"})
    headers4 = executor._build_headers(tool4, params={})
    expected = base64.b64encode(b"u:p").decode("ascii")
    assert headers4["Authorization"] == f"Basic {expected}"


def test_build_headers_rejects_missing_auth_details():
    executor = ToolExecutor(egress_policy=EgressPolicy(block_private_networks=False))

    with pytest.raises(ToolExecutionError):
        executor._build_headers(_tool(auth_type="bearer", auth_config={}), params={})

    with pytest.raises(ToolExecutionError):
        executor._build_headers(_tool(auth_type="api_key", auth_config={}), params={})


@pytest.mark.asyncio
async def test_execute_http_rejects_unsupported_method():
    executor = ToolExecutor(egress_policy=EgressPolicy(block_private_networks=False))
    with pytest.raises(ToolExecutionError) as err:
        await executor.execute_http(_tool(method="TRACE"), params={})
    assert "Unsupported HTTP method" in str(err.value)


@pytest.mark.asyncio
async def test_execute_http_parses_json_and_validates_output(monkeypatch):
    async def fake_request(self, client, method, url, *, headers, params):  # noqa: ARG001
        request = httpx.Request(method, url)
        return httpx.Response(
            200,
            json={"answer": "ok"},
            headers={"content-type": "application/json"},
            request=request,
        )

    monkeypatch.setattr(ToolExecutor, "_request_with_retry", fake_request, raising=True)

    executor = ToolExecutor(egress_policy=EgressPolicy(block_private_networks=False))
    tool = _tool(
        input_schema={"type": "object", "properties": {"q": {"type": "string"}}, "required": ["q"]},
        output_schema={"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]},
    )

    result = await executor.execute_http(tool, params={"q": "hello"})
    assert result.ok is True
    assert result.status_code == 200
    assert result.body == {"answer": "ok"}


@pytest.mark.asyncio
async def test_execute_http_raises_when_output_schema_does_not_match(monkeypatch):
    async def fake_request(self, client, method, url, *, headers, params):  # noqa: ARG001
        request = httpx.Request(method, url)
        return httpx.Response(
            200,
            json={"wrong": True},
            headers={"content-type": "application/json"},
            request=request,
        )

    monkeypatch.setattr(ToolExecutor, "_request_with_retry", fake_request, raising=True)

    executor = ToolExecutor(egress_policy=EgressPolicy(block_private_networks=False))
    tool = _tool(
        output_schema={"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]},
    )

    with pytest.raises(ToolExecutionError) as err:
        await executor.execute_http(tool, params={})
    assert "Tool output does not match schema" in str(err.value)
    assert err.value.details.get("errors")
