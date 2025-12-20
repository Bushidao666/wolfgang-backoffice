from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from modules.tools.domain.tool import McpServerConfig
from modules.tools.repository.tool_repository import ToolRepository
from modules.tools.services.agno_mcp_bridge import AgnoMcpBridge, AgnoMcpBridgeError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class McpTool:
    name: str
    description: str | None
    input_schema: dict[str, Any]


class McpError(RuntimeError):
    pass


class McpRegistry:
    def __init__(self, *, repo: ToolRepository):
        self._repo = repo
        self._bridge = AgnoMcpBridge()

    async def list_tools(self, server: McpServerConfig, *, refresh: bool = False) -> list[McpTool]:
        if (
            not refresh
            and server.tools_available
            and server.last_tools_sync_at
            and datetime.now(timezone.utc) - server.last_tools_sync_at < timedelta(minutes=15)
            and server.connection_status == "connected"
        ):
            return self._parse_tools(server.tools_available)

        try:
            specs = await self._bridge.list_tools(server)
            tools = [McpTool(name=s.name, description=s.description, input_schema=s.input_schema) for s in specs]
            await self._repo.update_mcp_tools(
                server_id=server.id,
                tools_available=[{"name": t.name, "description": t.description, "inputSchema": t.input_schema} for t in tools],
                connection_status="connected",
                last_error=None,
            )
            return tools
        except Exception as err:  # noqa: BLE001
            logger.exception("mcp.sync_failed", extra={"server_id": server.id, "server_url": server.server_url})
            await self._repo.update_mcp_tools(
                server_id=server.id,
                tools_available=server.tools_available or [],
                connection_status="error",
                last_error=str(err),
            )
            return self._parse_tools(server.tools_available or [])

    async def call_tool(self, server: McpServerConfig, *, tool_name: str, arguments: dict[str, Any]) -> Any:
        try:
            return await self._bridge.call_tool(server, tool_name=tool_name, arguments=arguments)
        except AgnoMcpBridgeError as err:
            raise McpError(str(err)) from err

    def _parse_tools(self, tools_raw: list[dict[str, Any]]) -> list[McpTool]:
        tools: list[McpTool] = []
        for t in tools_raw:
            if not isinstance(t, dict) or not t.get("name"):
                continue
            tools.append(
                McpTool(
                    name=str(t["name"]),
                    description=str(t.get("description")) if t.get("description") else None,
                    input_schema=dict(t.get("inputSchema") or t.get("input_schema") or {"type": "object", "properties": {}}),
                )
            )
        return tools

