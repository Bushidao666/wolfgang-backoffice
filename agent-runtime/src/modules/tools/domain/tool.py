from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class ToolConfig:
    id: str
    company_id: str
    centurion_id: str

    tool_name: str
    description: str | None

    endpoint: str
    method: str
    headers: dict[str, Any]
    auth_type: str | None
    auth_config: dict[str, Any]

    input_schema: dict[str, Any]
    output_schema: dict[str, Any] | None

    timeout_ms: int
    retry_count: int
    is_active: bool


@dataclass(frozen=True)
class McpServerConfig:
    id: str
    company_id: str
    centurion_id: str

    name: str
    server_url: str

    auth_type: str | None
    auth_config: dict[str, Any]

    tools_available: list[dict[str, Any]]
    last_tools_sync_at: datetime | None

    is_active: bool
    connection_status: str
    last_error: str | None

