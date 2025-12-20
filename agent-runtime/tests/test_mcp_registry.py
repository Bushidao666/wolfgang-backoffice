from __future__ import annotations

from datetime import datetime, timezone

import pytest

from modules.tools.domain.tool import McpServerConfig
from modules.tools.services.agno_mcp_bridge import AgnoMcpBridgeError, AgnoMcpToolSpec
from modules.tools.services.mcp_registry import McpError, McpRegistry


class _Repo:
    def __init__(self):
        self.updated: list[dict] = []

    async def update_mcp_tools(self, **kwargs):
        self.updated.append(kwargs)


def _server(**overrides) -> McpServerConfig:
    base = McpServerConfig(
        id="s1",
        company_id="co1",
        centurion_id="ct1",
        name="Server 1",
        server_url="https://mcp.test",
        auth_type=None,
        auth_config={},
        tools_available=[],
        last_tools_sync_at=None,
        is_active=True,
        connection_status="unknown",
        last_error=None,
    )
    return McpServerConfig(**{**base.__dict__, **overrides})


@pytest.mark.asyncio
async def test_list_tools_uses_cached_tools_when_recent_and_connected(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    async def fail_list(server):  # noqa: ARG001
        raise AssertionError("should not fetch")

    monkeypatch.setattr(registry._bridge, "list_tools", fail_list)  # noqa: SLF001

    server = _server(
        tools_available=[{"name": "t1", "description": "d", "inputSchema": {"type": "object", "properties": {}}}],
        connection_status="connected",
        last_tools_sync_at=datetime.now(timezone.utc),
    )

    tools = await registry.list_tools(server, refresh=False)
    assert tools and tools[0].name == "t1"
    assert repo.updated == []


def test_parse_tools_accepts_multiple_schema_keys():
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    tools = registry._parse_tools(  # noqa: SLF001
        [
            {"name": "a", "inputSchema": {"type": "object"}},
            {"name": "b", "input_schema": {"type": "object", "properties": {"x": {"type": "string"}}}},
            {"name": "c"},
        ]
    )
    assert [t.name for t in tools] == ["a", "b", "c"]
    assert tools[2].input_schema["type"] == "object"


@pytest.mark.asyncio
async def test_list_tools_refresh_updates_repo(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    async def fake_list(server):  # noqa: ARG001
        return [AgnoMcpToolSpec(name="t1", description=None, input_schema={"type": "object"})]

    monkeypatch.setattr(registry._bridge, "list_tools", fake_list)  # noqa: SLF001

    tools = await registry.list_tools(_server(), refresh=True)
    assert [t.name for t in tools] == ["t1"]
    assert repo.updated and repo.updated[0]["connection_status"] == "connected"


@pytest.mark.asyncio
async def test_list_tools_refresh_on_error_marks_repo_and_returns_cached(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    async def fail_list(server):  # noqa: ARG001
        raise RuntimeError("boom")

    monkeypatch.setattr(registry._bridge, "list_tools", fail_list)  # noqa: SLF001

    server = _server(
        tools_available=[{"name": "cached", "inputSchema": {"type": "object", "properties": {}}}],
        connection_status="connected",
    )
    tools = await registry.list_tools(server, refresh=True)
    assert [t.name for t in tools] == ["cached"]
    assert repo.updated and repo.updated[0]["connection_status"] == "error"


@pytest.mark.asyncio
async def test_call_tool_wraps_bridge_errors(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    async def fail_call(*args, **kwargs):  # noqa: ANN001, ARG001
        raise AgnoMcpBridgeError("nope")

    monkeypatch.setattr(registry._bridge, "call_tool", fail_call)  # noqa: SLF001

    with pytest.raises(McpError):
        await registry.call_tool(_server(), tool_name="x", arguments={})

