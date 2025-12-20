import json

import pytest

from agno.db.base import SessionType
from agno.session import AgentSession

from common.infrastructure.agno import storage as agno_storage
from common.infrastructure.agno.storage import CoreAgnoDb, build_user_id, parse_user_id


class _Db:
    def __init__(self):
        self.fetchrow_calls: list[tuple[str, tuple[object, ...]]] = []
        self.fetch_calls: list[tuple[str, tuple[object, ...]]] = []
        self.execute_calls: list[tuple[str, tuple[object, ...]]] = []
        self._fetchrow_queue: list[dict | None] = []
        self._fetch_queue: list[list[dict]] = []

    def queue_fetchrow(self, *rows: dict | None) -> None:
        self._fetchrow_queue.extend(rows)

    def queue_fetch(self, *rows: list[dict]) -> None:
        self._fetch_queue.extend(rows)

    async def fetchrow(self, query: str, *args):
        self.fetchrow_calls.append((query, args))
        return self._fetchrow_queue.pop(0) if self._fetchrow_queue else None

    async def fetch(self, query: str, *args):
        self.fetch_calls.append((query, args))
        return self._fetch_queue.pop(0) if self._fetch_queue else []

    async def execute(self, query: str, *args):
        self.execute_calls.append((query, args))
        return "UPDATE 1"


def test_user_id_helpers_roundtrip():
    user_id = build_user_id(company_id="co1", lead_id="l1")
    assert parse_user_id(user_id) == ("co1", "l1")
    assert parse_user_id("l1") == (None, "l1")
    with pytest.raises(agno_storage.AgnoUserIdError):
        parse_user_id("")


def test_epoch_s_handles_naive_and_aware_datetimes():
    naive = agno_storage.datetime(2025, 1, 1)
    aware = agno_storage.datetime(2025, 1, 1, tzinfo=agno_storage.timezone.utc)
    assert agno_storage._epoch_s(naive) == agno_storage._epoch_s(aware)


@pytest.mark.asyncio
async def test_get_session_deserializes_agent_session_from_metadata():
    db = _Db()
    db.queue_fetchrow(
        {
            "agno_session": {
                "session_id": "c1",
                "agent_id": "ct1",
                "user_id": "co1:l1",
                "session_data": {"session_state": {"k": "v"}},
                "runs": None,
                "summary": None,
            }
        }
    )
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    session = await agno_db.get_session("c1", SessionType.AGENT, deserialize=True)
    assert isinstance(session, AgentSession)
    assert session.session_id == "c1"

    # Non-agent sessions are ignored.
    assert await agno_db.get_session("c1", SessionType.TEAM, deserialize=True) is None

    db.queue_fetchrow({"agno_session": {"session_id": "c1"}})
    raw = await agno_db.get_session("c1", SessionType.AGENT, deserialize=False)
    assert isinstance(raw, dict)


@pytest.mark.asyncio
async def test_upsert_session_persists_without_runs():
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    session = AgentSession(
        session_id="c1",
        agent_id="ct1",
        user_id="co1:l1",
        session_data={"session_state": {"foo": "bar"}},
        runs=[],
    )

    res = await agno_db.upsert_session(session, deserialize=True)
    assert res is session
    assert db.execute_calls

    payload = db.execute_calls[0][1][1]
    stored = json.loads(payload)
    assert stored["session_id"] == "c1"
    assert stored["runs"] is None

    raw = await agno_db.upsert_session(session, deserialize=False)
    assert isinstance(raw, dict)


@pytest.mark.asyncio
async def test_memory_methods_roundtrip_user_memory(monkeypatch):
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    # upsert_user_memory writes
    from agno.db.schemas.memory import UserMemory

    mem = UserMemory(memory="prefere respostas curtas", memory_id=None, topics=["preference"], user_id="co1:l1", agent_id="ct1")
    await agno_db.upsert_user_memory(mem, deserialize=True)
    assert db.execute_calls

    # get_user_memories reads
    db.queue_fetch(
        [
            {
                "id": mem.memory_id,
                "summary": mem.memory,
                "qualification_context": {"agno": {"topics": ["preference"], "agent_id": "ct1"}},
                "created_at": None,
                "last_updated_at": None,
            }
        ]
    )
    memories = await agno_db.get_user_memories(user_id="co1:l1", deserialize=True)
    assert len(memories) == 1
    assert memories[0].memory == "prefere respostas curtas"


@pytest.mark.asyncio
async def test_schema_version_methods_are_noops():
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]
    assert await agno_db.table_exists("any") is True
    assert await agno_db.get_latest_schema_version("any") == "2.0.0"
    assert await agno_db.upsert_schema_version("any", "2.0.0") is None


@pytest.mark.asyncio
async def test_delete_session_removes_metadata_key():
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]
    assert await agno_db.delete_session("c1") is True


@pytest.mark.asyncio
async def test_delete_sessions_continues_on_errors(monkeypatch):
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    called: list[str] = []

    async def bad_delete(session_id: str):
        called.append(session_id)
        raise RuntimeError("boom")

    monkeypatch.setattr(agno_db, "delete_session", bad_delete)
    await agno_db.delete_sessions(["c1", "c2"])
    assert called == ["c1", "c2"]


@pytest.mark.asyncio
async def test_get_all_memory_topics_returns_distinct_topics():
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]
    db.queue_fetch([{"topic": "a"}, {"topic": "b"}, {"topic": ""}, {"topic": None}])
    topics = await agno_db.get_all_memory_topics(user_id="co1:l1")
    assert topics == ["a", "b"]


@pytest.mark.asyncio
async def test_rename_session_updates_metadata_and_reads_back():
    db = _Db()
    db.queue_fetchrow(
        {
            "agno_session": {
                "session_id": "c1",
                "agent_id": "ct1",
                "user_id": "co1:l1",
                "session_data": {"session_name": "new"},
            }
        }
    )
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    session = await agno_db.rename_session("c1", SessionType.AGENT, "new", deserialize=True)
    assert isinstance(session, AgentSession)
    assert session.session_data and session.session_data.get("session_name") == "new"


@pytest.mark.asyncio
async def test_misc_branches_for_coverage():
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    # get_sessions is a stub returning empty results.
    sessions, total = await agno_db.get_sessions()
    assert sessions == []
    assert total == 0

    # rename_session ignores non-agent session types.
    assert await agno_db.rename_session("c1", SessionType.TEAM, "x") is None

    # clear_memories is intentionally a no-op.
    assert await agno_db.clear_memories() is None

    # get_session drops invalid JSON blobs.
    db.queue_fetchrow({"agno_session": "{bad"})
    assert await agno_db.get_session("c1", SessionType.AGENT) is None

    # delete_user_memory no-ops when user_id is missing.
    await agno_db.delete_user_memory("00000000-0000-0000-0000-000000000000", user_id=None)

    # upsert_session ignores non-AgentSession payloads.
    assert await agno_db.upsert_session(session={}, deserialize=True) is None  # type: ignore[arg-type]

@pytest.mark.asyncio
async def test_unimplemented_components_raise_not_implemented():
    db = _Db()
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    async def _assert_ni(method, *args, **kwargs):
        with pytest.raises(NotImplementedError):
            await method(*args, **kwargs)

    await _assert_ni(agno_db.get_metrics)
    await _assert_ni(agno_db.calculate_metrics)
    await _assert_ni(agno_db.delete_knowledge_content, "k1")
    await _assert_ni(agno_db.get_knowledge_content, "k1")
    await _assert_ni(agno_db.get_knowledge_contents)
    await _assert_ni(agno_db.upsert_knowledge_content, {"id": "k1"})

    await _assert_ni(agno_db.create_eval_run, {"id": "e1"})
    await _assert_ni(agno_db.delete_eval_runs, ["e1"])
    await _assert_ni(agno_db.get_eval_run, "e1")
    await _assert_ni(agno_db.get_eval_runs)
    await _assert_ni(agno_db.rename_eval_run, "e1", "new-name")

    await _assert_ni(agno_db.upsert_trace, {"id": "t1"})
    await _assert_ni(agno_db.get_trace)
    await _assert_ni(agno_db.get_traces)
    await _assert_ni(agno_db.get_trace_stats)

    await _assert_ni(agno_db.create_span, {"id": "s1"})
    await _assert_ni(agno_db.create_spans, [{"id": "s1"}])
    await _assert_ni(agno_db.get_span, "s1")
    await _assert_ni(agno_db.get_spans)

    await _assert_ni(agno_db.clear_cultural_knowledge)
    await _assert_ni(agno_db.delete_cultural_knowledge, "c1")
    await _assert_ni(agno_db.get_cultural_knowledge, "c1")
    await _assert_ni(agno_db.get_all_cultural_knowledge)
    await _assert_ni(agno_db.upsert_cultural_knowledge, {"id": "c1"})


@pytest.mark.asyncio
async def test_delete_user_memory_resolves_company_id_from_lead_when_missing():
    db = _Db()
    # resolve company_id from core.leads
    db.queue_fetchrow({"company_id": "co1"})
    agno_db = CoreAgnoDb(db=db)  # type: ignore[arg-type]

    await agno_db.delete_user_memory(
        "00000000-0000-0000-0000-000000000000",
        user_id="00000000-0000-0000-0000-000000000001",
    )
    assert db.fetchrow_calls
    assert db.execute_calls
