from __future__ import annotations

import re
from typing import Any, Awaitable, Callable

from agno.tools.function import Function

from modules.tools.domain.tool import McpServerConfig
from modules.tools.services.mcp_registry import McpRegistry, McpTool


def _sanitize_tool_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_\\-]+", "_", name).strip("_")
    if not cleaned:
        cleaned = "tool"
    if cleaned[0].isdigit():
        cleaned = f"t_{cleaned}"
    return cleaned[:64]


class McpToolAdapter:
    def __init__(self, *, registry: McpRegistry):
        self._registry = registry

    def to_agno_function(self, *, server: McpServerConfig, tool: McpTool) -> Function:
        server_ns = _sanitize_tool_name(server.name)
        tool_ns = _sanitize_tool_name(tool.name)
        fn_name = f"mcp_{server_ns}__{tool_ns}"[:64]

        async def _entrypoint(**kwargs: Any):
            return await self._registry.call_tool(server, tool_name=tool.name, arguments=kwargs)

        return Function(
            name=fn_name,
            description=tool.description or f"MCP tool {tool.name} ({server.name})",
            parameters=tool.input_schema or {"type": "object", "properties": {}},
            entrypoint=_entrypoint,
            show_result=False,
        )

