import pytest

from modules.tools.repository.tool_repository import ToolRepository


class _Db:
    def __init__(self):
        self.fetch_calls: list[tuple[str, tuple[object, ...]]] = []
        self.execute_calls: list[tuple[str, tuple[object, ...]]] = []
        self.rows_tools = []
        self.rows_servers = []

    async def fetch(self, query: str, *args):
        self.fetch_calls.append((query, args))
        if "from core.tool_configs" in query:
            return list(self.rows_tools)
        if "from core.mcp_servers" in query:
            return list(self.rows_servers)
        return []

    async def execute(self, query: str, *args):
        self.execute_calls.append((query, args))
        return "OK"


@pytest.mark.asyncio
async def test_tool_repository_maps_rows_to_domain_objects():
    db = _Db()
    db.rows_tools = [
        {
            "id": "t1",
            "company_id": "co1",
            "centurion_id": "ct1",
            "tool_name": "tool",
            "description": "d",
            "endpoint": "https://example.test",
            "method": "POST",
            "headers": {"x": "y"},
            "auth_type": "bearer",
            "auth_config": {"token": "k"},
            "input_schema": {"type": "object"},
            "output_schema": {"type": "object"},
            "timeout_ms": 5000,
            "retry_count": 2,
            "is_active": True,
        }
    ]
    db.rows_servers = [
        {
            "id": "s1",
            "company_id": "co1",
            "centurion_id": "ct1",
            "name": "srv",
            "server_url": "https://mcp.test",
            "auth_type": None,
            "auth_config": {},
            "tools_available": [{"name": "x"}],
            "last_tools_sync_at": None,
            "is_active": True,
            "connection_status": "connected",
            "last_error": None,
        }
    ]

    repo = ToolRepository(db)  # type: ignore[arg-type]
    tools = await repo.list_tools(company_id="co1", centurion_id="ct1")
    servers = await repo.list_mcp_servers(company_id="co1", centurion_id="ct1")

    assert tools[0].tool_name == "tool"
    assert tools[0].headers["x"] == "y"
    assert tools[0].retry_count == 2
    assert servers[0].server_url == "https://mcp.test"
    assert servers[0].connection_status == "connected"


@pytest.mark.asyncio
async def test_update_mcp_tools_executes_update():
    db = _Db()
    repo = ToolRepository(db)  # type: ignore[arg-type]
    await repo.update_mcp_tools(server_id="s1", tools_available=[{"name": "x"}], connection_status="connected", last_error=None)
    assert db.execute_calls
    assert "update core.mcp_servers" in db.execute_calls[0][0]

