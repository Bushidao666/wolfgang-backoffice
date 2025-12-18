from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.integrations.crypto import decrypt_json
from modules.tools.domain.tool import McpServerConfig, ToolConfig


class ToolRepository:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def list_tools(self, *, company_id: str, centurion_id: str) -> list[ToolConfig]:
        rows = await self._db.fetch(
            """
            select *
            from core.tool_configs
            where company_id=$1
              and centurion_id=$2
              and is_active=true
            order by created_at asc
            """,
            company_id,
            centurion_id,
        )
        tools: list[ToolConfig] = []
        for r in rows:
            headers_enc = str(r.get("headers_enc") or "").strip()
            auth_secrets_enc = str(r.get("auth_secrets_enc") or "").strip()

            headers = decrypt_json(headers_enc) if headers_enc else dict(r.get("headers") or {})
            auth_config = decrypt_json(auth_secrets_enc) if auth_secrets_enc else dict(r.get("auth_config") or {})

            tools.append(
                ToolConfig(
                    id=str(r["id"]),
                    company_id=str(r["company_id"]),
                    centurion_id=str(r["centurion_id"]),
                    tool_name=str(r["tool_name"]),
                    description=str(r["description"]) if r.get("description") else None,
                    endpoint=str(r["endpoint"]),
                    method=str(r.get("method") or "POST"),
                    headers=headers,
                    auth_type=str(r["auth_type"]) if r.get("auth_type") else None,
                    auth_config=auth_config,
                    input_schema=dict(r.get("input_schema") or {}),
                    output_schema=dict(r.get("output_schema") or {}) if r.get("output_schema") else None,
                    timeout_ms=int(r.get("timeout_ms") or 10_000),
                    retry_count=int(r.get("retry_count") or 1),
                    is_active=bool(r.get("is_active") if r.get("is_active") is not None else True),
                )
            )
        return tools

    async def list_mcp_servers(self, *, company_id: str, centurion_id: str) -> list[McpServerConfig]:
        rows = await self._db.fetch(
            """
            select *
            from core.mcp_servers
            where company_id=$1
              and centurion_id=$2
              and is_active=true
            order by created_at asc
            """,
            company_id,
            centurion_id,
        )
        servers: list[McpServerConfig] = []
        for r in rows:
            auth_secrets_enc = str(r.get("auth_secrets_enc") or "").strip()
            auth_config = decrypt_json(auth_secrets_enc) if auth_secrets_enc else dict(r.get("auth_config") or {})

            last_sync: datetime | None = r.get("last_tools_sync_at")
            tools_available = r.get("tools_available") or []
            servers.append(
                McpServerConfig(
                    id=str(r["id"]),
                    company_id=str(r["company_id"]),
                    centurion_id=str(r["centurion_id"]),
                    name=str(r["name"]),
                    server_url=str(r["server_url"]),
                    auth_type=str(r["auth_type"]) if r.get("auth_type") else None,
                    auth_config=auth_config,
                    tools_available=list(tools_available) if isinstance(tools_available, list) else [],
                    last_tools_sync_at=last_sync,
                    is_active=bool(r.get("is_active") if r.get("is_active") is not None else True),
                    connection_status=str(r.get("connection_status") or "unknown"),
                    last_error=str(r.get("last_error")) if r.get("last_error") else None,
                )
            )
        return servers

    async def update_mcp_tools(
        self,
        *,
        server_id: str,
        tools_available: list[dict[str, Any]],
        connection_status: str,
        last_error: str | None,
    ) -> None:
        await self._db.execute(
            """
            update core.mcp_servers
            set tools_available=$2::jsonb,
                last_tools_sync_at=now(),
                connection_status=$3,
                last_error=$4,
                updated_at=now()
            where id=$1
            """,
            server_id,
            json.dumps(tools_available, ensure_ascii=False),
            connection_status,
            last_error,
        )
