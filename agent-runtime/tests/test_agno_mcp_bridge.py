from dataclasses import dataclass
from datetime import datetime, timezone

import pytest

from agno.session.summary import SessionSummaryResponse

from common.security.egress_policy import EgressPolicy
from modules.tools.domain.tool import McpServerConfig
from modules.tools.services.agno_mcp_bridge import (
    AgnoMcpBridge,
    AgnoMcpBridgeError,
    _build_headers,
    _sse_url,
)


def _server(**overrides) -> McpServerConfig:
    base = McpServerConfig(
        id="s1",
        company_id="00000000-0000-0000-0000-000000000000",
        centurion_id="ct1",
        name="Server 1",
        server_url="https://mcp.test",
        auth_type=None,
        auth_config={},
        tools_available=[],
        last_tools_sync_at=datetime.now(timezone.utc),
        is_active=True,
        connection_status="unknown",
        last_error=None,
    )
    return McpServerConfig(**{**base.__dict__, **overrides})


def test_sse_url_appends_suffix():
    assert _sse_url("https://example.test") == "https://example.test/sse"
    assert _sse_url("https://example.test/") == "https://example.test/sse"
    assert _sse_url("https://example.test/sse") == "https://example.test/sse"


def test_build_headers_supports_bearer_and_api_key():
    h1 = _build_headers(_server(auth_type="bearer", auth_config={"token": "t"}))
    assert h1["Authorization"] == "Bearer t"

    h2 = _build_headers(_server(auth_type="api_key", auth_config={"key": "k"}))
    assert h2["x-api-key"] == "k"

    h3 = _build_headers(_server(auth_type="api_key", auth_config={"header_name": "x-k", "key": "k2"}))
    assert h3["x-k"] == "k2"

    h4 = _build_headers(_server(auth_type="weird", auth_config={"token": "x"}))
    assert h4 == {}


@pytest.mark.asyncio
async def test_mcp_bridge_blocks_private_ips_by_default():
    bridge = AgnoMcpBridge()
    server = _server(server_url="http://127.0.0.1")

    with pytest.raises(AgnoMcpBridgeError):
        await bridge.list_tools(server)

    with pytest.raises(AgnoMcpBridgeError):
        await bridge.call_tool(server, tool_name="x", arguments={})


@pytest.mark.asyncio
async def test_mcp_bridge_lists_and_calls_tools_without_network(monkeypatch):
    class _Tool:
        name = "t1"
        description = "d"
        inputSchema = {"type": "object", "properties": {"x": {"type": "string"}}}

    class _Available:
        tools = [_Tool()]

    class _Session:
        async def list_tools(self):  # noqa: ANN001
            return _Available()

        async def call_tool(self, *, name, arguments):  # noqa: ANN001
            return SessionSummaryResponse(summary=f"called {name}", topics=["ok"])

    class _MCPTools:
        def __init__(self, *args, **kwargs):  # noqa: ANN001, ARG002
            self.session = _Session()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):  # noqa: ANN001, ARG002
            return None

    monkeypatch.setattr("agno.tools.mcp.MCPTools", _MCPTools, raising=True)

    bridge = AgnoMcpBridge(egress_policy=EgressPolicy(block_private_networks=False))
    server = _server(server_url="https://mcp.test")

    tools = await bridge.list_tools(server)
    assert tools and tools[0].name == "t1"

    out = await bridge.call_tool(server, tool_name="t1", arguments={"x": "y"})
    assert out["summary"] == "called t1"


def test_coerce_json_handles_dataclasses_and_objects():
    bridge = AgnoMcpBridge()

    @dataclass
    class D:
        x: int

    assert bridge._coerce_json(D(x=1)) == {"x": 1}  # noqa: SLF001

    class Obj:
        def __init__(self):
            self.a = 1

    assert bridge._coerce_json(Obj()) == {"a": 1}  # noqa: SLF001
