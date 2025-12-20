from __future__ import annotations

import logging
from dataclasses import dataclass
from dataclasses import asdict, is_dataclass
from typing import Any

from common.security.egress_policy import EgressPolicy, EgressPolicyError
from modules.tools.domain.tool import McpServerConfig

logger = logging.getLogger(__name__)


class AgnoMcpBridgeError(RuntimeError):
    pass


@dataclass(frozen=True)
class AgnoMcpToolSpec:
    name: str
    description: str | None
    input_schema: dict[str, Any]


def _sse_url(server_url: str) -> str:
    base = (server_url or "").rstrip("/")
    if base.endswith("/sse"):
        return base
    return f"{base}/sse"


def _build_headers(server: McpServerConfig) -> dict[str, Any]:
    auth_type = (server.auth_type or "").strip().lower()
    auth_config = server.auth_config or {}

    headers: dict[str, Any] = {}

    if auth_type in ("", "none"):
        return headers

    if auth_type == "bearer":
        token = str(auth_config.get("token") or "").strip()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    if auth_type == "api_key":
        header_name = str(auth_config.get("header_name") or "x-api-key")
        key = str(auth_config.get("key") or "").strip()
        if key:
            headers[header_name] = key
        return headers

    return headers


class AgnoMcpBridge:
    """
    Bridge between DB-backed MCP server configs and Agno's MCPTools.

    Important: MCPTools must be used as an async context manager to ensure the underlying
    client session is closed. This bridge centralizes that behavior and provides safe fallbacks.
    """

    def __init__(self, *, egress_policy: EgressPolicy | None = None) -> None:
        self._egress = egress_policy or EgressPolicy.from_env()

    async def list_tools(self, server: McpServerConfig) -> list[AgnoMcpToolSpec]:
        url = _sse_url(server.server_url)
        headers = _build_headers(server)

        try:
            await self._egress.assert_url_allowed(url)
        except EgressPolicyError as err:
            raise AgnoMcpBridgeError(f"Blocked MCP server URL by egress policy: {url}") from err

        try:
            from agno.tools.mcp import MCPTools
            from agno.tools.mcp.params import SSEClientParams
        except Exception as err:
            raise AgnoMcpBridgeError("MCPTools is unavailable (missing dependency: mcp)") from err

        async with MCPTools(
            transport="sse",
            server_params=SSEClientParams(url=url, headers=headers),
            timeout_seconds=10,
        ) as mcp_tools:
            try:
                available = await mcp_tools.session.list_tools()  # type: ignore[union-attr]
            except Exception as err:
                raise AgnoMcpBridgeError(f"Failed to list tools from MCP server: {server.name}") from err

            tools: list[AgnoMcpToolSpec] = []
            raw_tools = getattr(available, "tools", None)
            if not isinstance(raw_tools, list):
                return tools

            for t in raw_tools:
                name = getattr(t, "name", None)
                if not name:
                    continue
                tools.append(
                    AgnoMcpToolSpec(
                        name=str(name),
                        description=str(getattr(t, "description", None)) if getattr(t, "description", None) else None,
                        input_schema=dict(getattr(t, "inputSchema", None) or {"type": "object", "properties": {}}),
                    )
                )

            return tools

    async def call_tool(self, server: McpServerConfig, *, tool_name: str, arguments: dict[str, Any]) -> Any:
        url = _sse_url(server.server_url)
        headers = _build_headers(server)

        try:
            await self._egress.assert_url_allowed(url)
        except EgressPolicyError as err:
            raise AgnoMcpBridgeError(f"Blocked MCP server URL by egress policy: {url}") from err

        try:
            from agno.tools.mcp import MCPTools
            from agno.tools.mcp.params import SSEClientParams
        except Exception as err:
            raise AgnoMcpBridgeError("MCPTools is unavailable (missing dependency: mcp)") from err

        async with MCPTools(
            transport="sse",
            server_params=SSEClientParams(url=url, headers=headers),
            timeout_seconds=20,
        ) as mcp_tools:
            try:
                raw = await mcp_tools.session.call_tool(name=tool_name, arguments=arguments)  # type: ignore[union-attr]
                return self._coerce_json(raw)
            except Exception as err:
                logger.exception("mcp.call_failed", extra={"extra": {"server_id": server.id, "tool_name": tool_name}})
                raise AgnoMcpBridgeError(f"MCP tool call failed: {tool_name}") from err

    def _coerce_json(self, value: Any) -> Any:
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, (dict, list)):
            return value
        if hasattr(value, "model_dump"):
            try:
                return value.model_dump(mode="json")  # type: ignore[no-any-return]
            except Exception:
                pass
        if is_dataclass(value):
            try:
                return asdict(value)
            except Exception:
                pass
        if hasattr(value, "dict") and callable(value.dict):
            try:
                return value.dict()  # type: ignore[no-any-return]
            except Exception:
                pass
        if hasattr(value, "__dict__"):
            try:
                return dict(value.__dict__)
            except Exception:
                pass
        return str(value)
