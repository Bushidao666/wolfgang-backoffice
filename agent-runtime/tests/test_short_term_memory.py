import pytest

from modules.centurion.domain.message import Message
from modules.memory.services.short_term_memory import ShortTermMemory


class _Redis:
    def __init__(self, cached):
        self.cached = cached
        self.set_calls: list[tuple[str, object, int | None]] = []
        self.deleted: list[str] = []

    async def get_json(self, key: str):
        return self.cached.get(key) if isinstance(self.cached, dict) else self.cached

    async def set_json(self, key: str, value, *, ttl_s: int | None = None):
        self.set_calls.append((key, value, ttl_s))

    async def delete(self, key: str):
        self.deleted.append(key)


class _Repo:
    def __init__(self, messages: list[Message]):
        self.messages = messages
        self.calls: list[tuple[str, int, bool]] = []

    async def list_recent(self, *, conversation_id: str, limit: int, include_archived: bool = False):  # noqa: ARG002
        self.calls.append((conversation_id, limit, include_archived))
        return list(self.messages)


class _Db:
    def __init__(self, *, agno_session):
        self.agno_session = agno_session

    async def fetchrow(self, query: str, *args):  # noqa: ARG002
        return {"agno_session": self.agno_session}


@pytest.mark.asyncio
async def test_get_conversation_history_uses_cache_when_present():
    cached = {
        "conv:conv1:history:25": [
            {"id": "m1", "conversation_id": "conv1", "company_id": "co1", "lead_id": "l1", "direction": "inbound", "content_type": "text", "content": "oi", "metadata": {}},
        ]
    }
    redis = _Redis(cached)
    memory = ShortTermMemory(db=object(), redis=redis)  # type: ignore[arg-type]
    memory._repo = _Repo([])  # type: ignore[attr-defined]

    msgs = await memory.get_conversation_history(conversation_id="conv1", limit=25)
    assert len(msgs) == 1
    assert msgs[0].content == "oi"
    assert memory._repo.calls == []  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_get_conversation_history_fetches_and_sets_cache_when_missing():
    redis = _Redis({})
    m = Message(id="m1", conversation_id="conv1", company_id="co1", lead_id="l1", direction="inbound", content_type="text", content="oi")
    memory = ShortTermMemory(db=object(), redis=redis)  # type: ignore[arg-type]
    memory._repo = _Repo([m])  # type: ignore[attr-defined]

    msgs = await memory.get_conversation_history(conversation_id="conv1", limit=25)
    assert msgs[0].content == "oi"
    assert memory._repo.calls == [("conv1", 25, False)]  # type: ignore[attr-defined]
    assert redis.set_calls and redis.set_calls[0][2] == 60


@pytest.mark.asyncio
async def test_invalidate_cache_deletes_known_keys():
    redis = _Redis({})
    memory = ShortTermMemory(db=object(), redis=redis)  # type: ignore[arg-type]
    await memory.invalidate_cache("conv1")
    assert redis.deleted == ["conv:conv1:history:10", "conv:conv1:history:15", "conv:conv1:history:25"]


@pytest.mark.asyncio
async def test_get_conversation_history_uses_smaller_window_when_summary_exists():
    redis = _Redis({})
    conversation_id = "00000000-0000-0000-0000-000000000000"
    m = Message(
        id="m1",
        conversation_id=conversation_id,
        company_id="co1",
        lead_id="l1",
        direction="inbound",
        content_type="text",
        content="oi",
    )
    db = _Db(agno_session={"summary": {"summary": "s"}})
    memory = ShortTermMemory(db=db, redis=redis)  # type: ignore[arg-type]
    memory._repo = _Repo([m])  # type: ignore[attr-defined]

    msgs = await memory.get_conversation_history(conversation_id=conversation_id)
    assert msgs and msgs[0].content == "oi"
    assert memory._repo.calls == [(conversation_id, 15, False)]  # type: ignore[attr-defined]
