from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter

from modules.tools.domain.tool import McpServerConfig
from modules.tools.repository.tool_repository import ToolRepository

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
            tools = await self._fetch_tools(server)
            await self._repo.update_mcp_tools(
                server_id=server.id,
                tools_available=[{"name": t.name, "description": t.description, "inputSchema": t.input_schema} for t in tools],
                connection_status="connected",
                last_error=None,
            )
            return tools
        except Exception as err:
            logger.exception("mcp.sync_failed", extra={"server_id": server.id, "server_url": server.server_url})
            await self._repo.update_mcp_tools(
                server_id=server.id,
                tools_available=server.tools_available or [],
                connection_status="error",
                last_error=str(err),
            )
            return self._parse_tools(server.tools_available or [])

    async def call_tool(self, server: McpServerConfig, *, tool_name: str, arguments: dict[str, Any]) -> Any:
        result = await self._rpc(server, method="tools/call", params={"name": tool_name, "arguments": arguments})
        # MCP spec returns {content:[{type,text|...}]} or arbitrary; keep raw and let LLM interpret.
        return result

    async def _fetch_tools(self, server: McpServerConfig) -> list[McpTool]:
        result = await self._rpc(server, method="tools/list", params={})
        tools_raw = result.get("tools") if isinstance(result, dict) else None
        if not isinstance(tools_raw, list):
            raise McpError("Invalid tools/list response")
        return self._parse_tools(tools_raw)

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

    async def _rpc(self, server: McpServerConfig, *, method: str, params: dict[str, Any]) -> Any:
        base = server.server_url.rstrip("/")
        sse_url = f"{base}/sse"
        messages_url = f"{base}/messages"

        headers = self._build_headers(server)
        request_id = str(uuid.uuid4())

        init_id = str(uuid.uuid4())
        init_req = {
            "jsonrpc": "2.0",
            "id": init_id,
            "method": "initialize",
            "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "wolfgang-agent-runtime", "version": "0.1.0"}},
        }
        req = {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}

        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0), headers=headers) as client:
            async with client.stream("GET", sse_url) as stream:
                if stream.status_code >= 400:
                    raise McpError(f"MCP SSE failed ({stream.status_code})")

                await self._post_message(client, messages_url, init_req)
                await self._wait_response(stream, init_id)

                await self._post_message(client, messages_url, req)
                return await self._wait_response(stream, request_id)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=0.3, max=2.0),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.TransportError, McpError)),
    )
    async def _post_message(self, client: httpx.AsyncClient, url: str, payload: dict[str, Any]) -> None:
        res = await client.post(url, json=payload)
        if res.status_code >= 400:
            raise McpError(f"MCP message POST failed ({res.status_code})")

    async def _wait_response(self, stream: httpx.Response, request_id: str) -> Any:
        data_lines: list[str] = []

        async for line in stream.aiter_lines():
            if line is None:
                continue
            if line == "":
                if not data_lines:
                    continue
                raw = "\n".join(data_lines)
                data_lines = []
                try:
                    msg = json.loads(raw)
                except Exception:
                    continue

                if not isinstance(msg, dict):
                    continue

                msg_id = msg.get("id")
                if msg_id is None or str(msg_id) != str(request_id):
                    continue

                if "error" in msg and msg["error"]:
                    raise McpError(str(msg["error"]))

                return msg.get("result")

            if line.startswith(":"):
                continue
            if line.startswith("data:"):
                data_lines.append(line[len("data:") :].lstrip())

        raise McpError("MCP stream ended before response")

    def _build_headers(self, server: McpServerConfig) -> dict[str, str]:
        auth_type = (server.auth_type or "").strip().lower()
        auth_config = server.auth_config or {}

        headers: dict[str, str] = {"Accept": "text/event-stream"}

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

