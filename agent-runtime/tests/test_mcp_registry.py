from __future__ import annotations

import pytest

from modules.tools.domain.tool import McpServerConfig
from modules.tools.services.mcp_registry import McpRegistry, McpTool, McpError


class _Repo:
    def __init__(self):
        self.updated: list[dict] = []

    async def update_mcp_tools(self, **kwargs):
        self.updated.append(kwargs)


class _Stream:
    def __init__(self, lines: list[str]):
        self._lines = lines

    async def aiter_lines(self):
        for line in self._lines:
            yield line


def _server(**overrides) -> McpServerConfig:
    base = McpServerConfig(
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
        connection_status="unknown",
        last_error=None,
    )
    return McpServerConfig(**{**base.__dict__, **overrides})


@pytest.mark.asyncio
async def test_list_tools_uses_cached_tools_when_recent_and_connected(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    called = {"fetch": False}

    async def fail_fetch(*args, **kwargs):  # noqa: ARG001
        called["fetch"] = True
        raise AssertionError("should not fetch")

    monkeypatch.setattr(registry, "_fetch_tools", fail_fetch)

    server = _server(
        tools_available=[{"name": "t1", "description": "d", "inputSchema": {"type": "object", "properties": {}}}],
        connection_status="connected",
        last_tools_sync_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )

    tools = await registry.list_tools(server, refresh=False)
    assert tools and tools[0].name == "t1"
    assert called["fetch"] is False


def test_parse_tools_accepts_multiple_schema_keys():
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]
    tools = registry._parse_tools(  # noqa: SLF001
        [
            {"name": "a", "inputSchema": {"type": "object"}},
            {"name": "b", "input_schema": {"type": "object", "properties": {"x": {"type": "string"}}}},
            {"name": "c"},
        ]
    )
    assert [t.name for t in tools] == ["a", "b", "c"]
    assert tools[2].input_schema["type"] == "object"


def test_build_headers_supports_none_bearer_and_api_key():
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    server_none = _server(auth_type=None, auth_config={})
    assert registry._build_headers(server_none)["Accept"] == "text/event-stream"  # noqa: SLF001

    server_bearer = _server(auth_type="bearer", auth_config={"token": "t"})
    assert registry._build_headers(server_bearer)["Authorization"] == "Bearer t"  # noqa: SLF001

    server_api = _server(auth_type="api_key", auth_config={"header_name": "x-k", "key": "v"})
    assert registry._build_headers(server_api)["x-k"] == "v"  # noqa: SLF001


@pytest.mark.asyncio
async def test_list_tools_refresh_updates_repo(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    async def fake_fetch(server):  # noqa: ARG001
        return [McpTool(name="t1", description=None, input_schema={"type": "object"})]

    monkeypatch.setattr(registry, "_fetch_tools", fake_fetch)

    server = _server()
    tools = await registry.list_tools(server, refresh=True)
    assert [t.name for t in tools] == ["t1"]
    assert repo.updated and repo.updated[0]["connection_status"] == "connected"


@pytest.mark.asyncio
async def test_list_tools_refresh_on_error_marks_repo_and_returns_cached(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    async def fake_fetch(server):  # noqa: ARG001
        raise RuntimeError("boom")

    monkeypatch.setattr(registry, "_fetch_tools", fake_fetch)

    server = _server(tools_available=[{"name": "cached"}], connection_status="connected")
    tools = await registry.list_tools(server, refresh=True)
    assert [t.name for t in tools] == ["cached"]
    assert repo.updated and repo.updated[0]["connection_status"] == "error"


@pytest.mark.asyncio
async def test_rpc_posts_initialize_and_call_and_returns_result(monkeypatch):
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    ids = ["req1", "init1"]

    def fake_uuid4():
        return ids.pop(0)

    monkeypatch.setattr("modules.tools.services.mcp_registry.uuid.uuid4", fake_uuid4)

    class _PostRes:
        status_code = 200

    class _StreamObj:
        status_code = 200

        def __init__(self, lines):
            self._lines = lines

        async def aiter_lines(self):
            for l in self._lines:
                yield l

    class _StreamCtx:
        def __init__(self, stream):
            self._stream = stream

        async def __aenter__(self):
            return self._stream

        async def __aexit__(self, exc_type, exc, tb):  # noqa: ARG002
            return False

    class _Client:
        def __init__(self, *a, **k):  # noqa: ARG002
            self.posts: list[tuple[str, dict]] = []
            self.stream_url: str | None = None

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):  # noqa: ARG002
            return False

        def stream(self, method: str, url: str):  # noqa: ARG002
            self.stream_url = url
            lines = [
                'data: {"jsonrpc":"2.0","id":"init1","result":{"ok":1}}',
                "",
                'data: {"jsonrpc":"2.0","id":"req1","result":{"answer":2}}',
                "",
            ]
            return _StreamCtx(_StreamObj(lines))

        async def post(self, url: str, json: dict):  # noqa: A002
            self.posts.append((url, json))
            return _PostRes()

    monkeypatch.setattr("modules.tools.services.mcp_registry.httpx.AsyncClient", _Client)

    server = _server(server_url="https://mcp.test")
    res = await registry._rpc(server, method="tools/list", params={})  # noqa: SLF001
    assert res == {"answer": 2}


@pytest.mark.asyncio
async def test_wait_response_returns_matching_result():
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    stream = _Stream(
        [
            ": keep-alive",
            'data: {"jsonrpc":"2.0","id":"other","result":{"x":1}}',
            "",
            'data: {"jsonrpc":"2.0","id":"req1","result":{"ok":true}}',
            "",
        ]
    )

    res = await registry._wait_response(stream, "req1")  # noqa: SLF001
    assert res == {"ok": True}


@pytest.mark.asyncio
async def test_wait_response_raises_on_error():
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    stream = _Stream(
        [
            'data: {"jsonrpc":"2.0","id":"req1","error":{"message":"boom"}}',
            "",
        ]
    )

    with pytest.raises(McpError):
        await registry._wait_response(stream, "req1")  # noqa: SLF001


@pytest.mark.asyncio
async def test_wait_response_raises_when_stream_ends():
    repo = _Repo()
    registry = McpRegistry(repo=repo)  # type: ignore[arg-type]

    stream = _Stream([])
    with pytest.raises(McpError):
        await registry._wait_response(stream, "req1")  # noqa: SLF001
