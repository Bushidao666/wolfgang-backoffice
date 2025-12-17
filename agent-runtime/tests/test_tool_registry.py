import pytest

from modules.tools.domain.tool import McpServerConfig, ToolConfig
from modules.tools.services.mcp_registry import McpTool
from modules.tools.services.tool_executor import ToolResult
from modules.tools.services.tool_registry import ToolRegistry, _sanitize_tool_name
from modules.tools.services.mcp_tool_adapter import McpToolAdapter


def test_sanitize_tool_name_produces_safe_identifier():
    assert _sanitize_tool_name("My Tool!") == "My_Tool"
    assert _sanitize_tool_name("123 abc") == "t_123_abc"
    assert _sanitize_tool_name("   ") == "tool"


@pytest.mark.asyncio
async def test_tool_registry_builds_custom_tools_and_executes(monkeypatch):
    tool = ToolConfig(
        id="t1",
        company_id="co1",
        centurion_id="ct1",
        tool_name="My Tool!",
        description="desc",
        endpoint="https://example.test/tool",
        method="POST",
        headers={},
        auth_type=None,
        auth_config={},
        input_schema={"type": "object", "properties": {"x": {"type": "number"}}, "required": ["x"]},
        output_schema=None,
        timeout_ms=1000,
        retry_count=1,
        is_active=True,
    )

    class _Repo:
        async def list_tools(self, *, company_id: str, centurion_id: str):  # noqa: ARG002
            return [tool]

        async def list_mcp_servers(self, *, company_id: str, centurion_id: str):  # noqa: ARG002
            return []

    registry = ToolRegistry(repo=_Repo())  # type: ignore[arg-type]

    async def fake_execute_http(tool_cfg, params):  # noqa: ARG001
        return ToolResult(ok=True, status_code=200, body={"x": params["x"]}, headers={})

    monkeypatch.setattr(registry._executor, "execute_http", fake_execute_http)  # noqa: SLF001

    tools = await registry.get_tools(company_id="co1", centurion_id="ct1")
    assert tools and tools[0].name == "My_Tool"

    out = await tools[0].entrypoint(x=1)  # type: ignore[attr-defined]
    assert out["ok"] is True
    assert out["body"]["x"] == 1


@pytest.mark.asyncio
async def test_mcp_tool_adapter_builds_function_name(monkeypatch):
    class _Registry:
        async def call_tool(self, server, *, tool_name: str, arguments: dict):  # noqa: ARG002
            return {"ok": True, "tool": tool_name, "args": arguments}

    adapter = McpToolAdapter(registry=_Registry())  # type: ignore[arg-type]

    server = McpServerConfig(
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
        connection_status="connected",
        last_error=None,
    )
    tool = McpTool(name="Do Thing", description=None, input_schema={"type": "object", "properties": {}})

    fn = adapter.to_agno_function(server=server, tool=tool)
    assert fn.name.startswith("mcp_")

    res = await fn.entrypoint(x=1)  # type: ignore[attr-defined]
    assert res["ok"] is True
    assert res["tool"] == "Do Thing"

