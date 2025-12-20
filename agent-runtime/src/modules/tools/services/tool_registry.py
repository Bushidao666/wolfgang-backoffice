from __future__ import annotations

import logging
import re
from typing import Any

from agno.tools.function import Function

from modules.tools.domain.tool import McpServerConfig, ToolConfig
from modules.tools.repository.tool_repository import ToolRepository
from modules.tools.services.mcp_registry import McpRegistry
from modules.tools.services.mcp_tool_adapter import McpToolAdapter
from modules.tools.services.schema_validator import SchemaValidator
from modules.tools.services.tool_executor import ToolExecutor

logger = logging.getLogger(__name__)


def _sanitize_tool_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_\\-]+", "_", name).strip("_")
    if not cleaned:
        cleaned = "tool"
    if cleaned[0].isdigit():
        cleaned = f"t_{cleaned}"
    return cleaned[:64]


class ToolRegistry:
    def __init__(self, *, repo: ToolRepository):
        self._repo = repo
        self._validator = SchemaValidator()
        self._executor = ToolExecutor(validator=self._validator)
        self._mcp = McpRegistry(repo=repo)
        self._mcp_adapter = McpToolAdapter(registry=self._mcp)

    async def get_tools(self, *, company_id: str, centurion_id: str) -> list[Function]:
        tools = await self._repo.list_tools(company_id=company_id, centurion_id=centurion_id)
        servers = await self._repo.list_mcp_servers(company_id=company_id, centurion_id=centurion_id)

        functions: list[Function] = []

        for tool in tools:
            try:
                functions.append(self._to_custom_function(tool))
            except Exception:
                logger.exception("tool_registry.custom_tool_failed", extra={"tool_id": tool.id})

        for server in servers:
            try:
                mcp_tools = await self._mcp.list_tools(server)
                for t in mcp_tools:
                    functions.append(self._mcp_adapter.to_agno_function(server=server, tool=t))
            except Exception:
                logger.exception("tool_registry.mcp_tools_failed", extra={"server_id": server.id})

        return functions

    def _to_custom_function(self, tool: ToolConfig) -> Function:
        if tool.input_schema:
            self._validator.validate_schema(tool.input_schema, label="input_schema")
        if tool.output_schema:
            self._validator.validate_schema(tool.output_schema, label="output_schema")

        fn_name = _sanitize_tool_name(tool.tool_name)

        async def _entrypoint(**kwargs: Any):
            try:
                result = await self._executor.execute_http(tool, params=kwargs)
                return {"ok": result.ok, "status_code": result.status_code, "body": result.body}
            except Exception as err:
                # Tool failures should not crash the whole run; return a structured error.
                details = getattr(err, "details", None)
                return {"ok": False, "status_code": 0, "error": str(err), "details": details}

        return Function(
            name=fn_name,
            description=tool.description or f"HTTP tool {tool.tool_name}",
            parameters=tool.input_schema or {"type": "object", "properties": {}},
            entrypoint=_entrypoint,
            show_result=False,
        )
