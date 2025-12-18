import base64
import hashlib
import os

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from modules.tools.repository.tool_repository import ToolRepository


def _encrypt_v1(plaintext: str, *, key: str) -> str:
    iv = os.urandom(12)
    aesgcm = AESGCM(hashlib.sha256(key.encode("utf-8")).digest())
    out = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext, tag = out[:-16], out[-16:]

    return "v1:{iv}:{tag}:{data}".format(
        iv=base64.b64encode(iv).decode("ascii"),
        tag=base64.b64encode(tag).decode("ascii"),
        data=base64.b64encode(ciphertext).decode("ascii"),
    )


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
    os.environ.setdefault("APP_ENCRYPTION_KEY_CURRENT", "k1")
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
            "headers": {"x": "plaintext"},
            "headers_enc": _encrypt_v1('{"x":"encrypted"}', key="k1"),
            "auth_type": "bearer",
            "auth_config": {"token": "plaintext"},
            "auth_secrets_enc": _encrypt_v1('{"token":"encrypted"}', key="k1"),
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
            "auth_secrets_enc": _encrypt_v1('{"token":"mcp"}', key="k1"),
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
    assert tools[0].headers["x"] == "encrypted"
    assert tools[0].auth_config["token"] == "encrypted"
    assert tools[0].retry_count == 2
    assert servers[0].server_url == "https://mcp.test"
    assert servers[0].auth_config["token"] == "mcp"
    assert servers[0].connection_status == "connected"


@pytest.mark.asyncio
async def test_update_mcp_tools_executes_update():
    db = _Db()
    repo = ToolRepository(db)  # type: ignore[arg-type]
    await repo.update_mcp_tools(server_id="s1", tools_available=[{"name": "x"}], connection_status="connected", last_error=None)
    assert db.execute_calls
    assert "update core.mcp_servers" in db.execute_calls[0][0]
