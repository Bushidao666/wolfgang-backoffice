import uuid
from datetime import datetime, timezone

import pytest

from modules.centurion.media.media_tool import MediaTool


class _FakeDb:
    def __init__(self, rows=None, *, fail: bool = False):
        self.rows = rows or []
        self.fail = fail
        self.last_query: str | None = None
        self.last_args: tuple[object, ...] | None = None

    async def fetch(self, query: str, *args):  # noqa: ANN001
        self.last_query = query
        self.last_args = args
        if self.fail:
            raise RuntimeError("boom")
        return self.rows


@pytest.mark.asyncio
async def test_media_tool_builds_query_and_maps_rows():
    company_id = str(uuid.uuid4())
    centurion_id = str(uuid.uuid4())
    row = {
        "id": uuid.uuid4(),
        "company_id": uuid.uuid4(),
        "centurion_id": None,
        "name": "Logo",
        "description": "desc",
        "media_type": "image",
        "mime_type": "image/png",
        "tags": ["foo", "bar"],
        "file_size_bytes": 123,
        "created_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
    }
    db = _FakeDb(rows=[row])
    tool = MediaTool(db=db)  # type: ignore[arg-type]
    fn = tool.as_function(company_id=company_id, centurion_id=centurion_id)

    res = await fn.entrypoint(q="logo", tags="foo,bar", media_type="image", limit=2)
    assert isinstance(res, dict)
    assert "assets" in res
    assert len(res["assets"]) == 1

    asset = res["assets"][0]
    assert asset["name"] == "Logo"
    assert asset["mime_type"] == "image/png"
    assert asset["media_type"] == "image"
    assert asset["tags"] == ["foo", "bar"]
    assert asset["created_at"].startswith("2025-01-01T")

    assert db.last_query is not None
    assert "from core.media_assets" in db.last_query
    assert "tags ?|" in db.last_query
    assert "media_type=" in db.last_query
    assert db.last_args == (company_id, centurion_id, "%logo%", "image", ["foo", "bar"], 2)


@pytest.mark.asyncio
async def test_media_tool_returns_error_on_db_failure():
    company_id = str(uuid.uuid4())
    centurion_id = str(uuid.uuid4())
    db = _FakeDb(fail=True)
    tool = MediaTool(db=db)  # type: ignore[arg-type]
    fn = tool.as_function(company_id=company_id, centurion_id=centurion_id)

    res = await fn.entrypoint(q="logo", tags="foo,bar", media_type="image", limit="nope")  # type: ignore[arg-type]
    assert res["assets"] == []
    assert "error" in res
