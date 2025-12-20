import json

import pytest

from common.infrastructure.integrations.openai_resolver import OpenAIResolved
from modules.centurion.services.centurion_service import CenturionService


class _FakeDb:
    def __init__(self, row):
        self._row = row
        self.calls: list[tuple[str, tuple[object, ...]]] = []

    async def fetchrow(self, query: str, *args):
        self.calls.append((query, args))
        return self._row

    async def fetch(self, query: str, *args):  # noqa: ARG002
        return []

    async def execute(self, query: str, *args):  # noqa: ARG002
        return "OK"


class _FakeRedis:
    def __init__(self):
        self.published: list[tuple[str, str]] = []

    async def publish(self, channel: str, message: str) -> None:
        self.published.append((channel, message))

    async def get(self, key: str):  # noqa: ARG002
        return None

    async def set(self, key: str, value: str, *, ttl_s: int | None = None):  # noqa: ARG002
        return None

    async def delete(self, key: str):  # noqa: ARG002
        return None

    async def get_json(self, key: str):  # noqa: ARG002
        return None

    async def set_json(self, key: str, value, *, ttl_s: int | None = None):  # noqa: ARG002
        return None


@pytest.mark.asyncio
async def test_test_centurion_uses_fallback_when_no_openai_key():
    db = _FakeDb(
        {
            "id": "ct1",
            "company_id": "co1",
            "prompt": "Você é um SDR educado e objetivo.",
            "qualification_rules": {"required_fields": ["budget", "date"]},
        }
    )
    redis = _FakeRedis()
    service = CenturionService(db=db, redis=redis)  # type: ignore[arg-type]

    res = await service.test_centurion(company_id="co1", centurion_id="ct1", message="oi")
    assert res["ok"] is True
    assert "budget" in res["response"]
    assert "date" in res["response"]
    assert db.calls
    assert db.calls[0][1] == ("ct1", "co1")


@pytest.mark.asyncio
async def test_test_centurion_raises_value_error_when_missing():
    db = _FakeDb(None)
    redis = _FakeRedis()
    service = CenturionService(db=db, redis=redis)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        await service.test_centurion(company_id="co1", centurion_id="missing", message="oi")


@pytest.mark.asyncio
async def test_publish_lead_qualified_emits_event():
    db = _FakeDb({})
    redis = _FakeRedis()
    service = CenturionService(db=db, redis=redis)  # type: ignore[arg-type]

    await service._publish_lead_qualified(  # noqa: SLF001
        company_id="co1",
        lead_id="l1",
        score=1.0,
        criteria=["budget"],
        summary="budget=R$ 100",
        correlation_id="corr1",
        causation_id=None,
    )

    assert len(redis.published) == 1
    channel, payload = redis.published[0]
    assert channel == "lead.qualified"

    data = json.loads(payload)
    assert data["type"] == "lead.qualified"
    assert data["company_id"] == "co1"
    assert data["correlation_id"] == "corr1"
    assert data["payload"]["lead_id"] == "l1"
    assert data["payload"]["criteria"] == ["budget"]


@pytest.mark.asyncio
async def test_call_llm_includes_media_tool_when_openai_is_configured(monkeypatch: pytest.MonkeyPatch):
    db = _FakeDb({})
    redis = _FakeRedis()
    service = CenturionService(db=db, redis=redis)  # type: ignore[arg-type]

    async def fake_resolve_optional(*, company_id: str):  # noqa: ARG001
        return OpenAIResolved(
            api_key="k",
            base_url="https://example.com",
            chat_model="gpt-4o-mini",
            vision_model="gpt-4o-mini",
            stt_model="whisper-1",
            embedding_model="text-embedding-3-small",
        )

    async def fake_get_tools(*, company_id: str, centurion_id: str):  # noqa: ARG001
        return []

    captured: dict[str, object] = {}

    class _FakeAgent:
        async def arun(self, *args, **kwargs):  # noqa: ANN002, ANN003, ARG002
            class _Out:
                content = "ok"

            return _Out()

    def fake_build_agent(**kwargs):  # noqa: ANN003
        captured["tools"] = kwargs.get("tools")
        return _FakeAgent()

    monkeypatch.setattr(service._openai, "resolve_optional", fake_resolve_optional)  # noqa: SLF001
    monkeypatch.setattr(service._tools, "get_tools", fake_get_tools)  # noqa: SLF001
    monkeypatch.setattr(service._agno_factory, "build_agent", fake_build_agent)  # noqa: SLF001

    content = await service._call_llm(  # noqa: SLF001
        [{"role": "system", "content": "system"}, {"role": "user", "content": "oi"}],
        config={"prompt": "system"},
        company_id="co1",
        centurion_id="ct1",
        conversation_id="conv1",
        lead_id="lead1",
        include_media_tools=True,
    )
    assert content == "ok"

    tools = captured.get("tools")
    assert isinstance(tools, list)
    assert any(getattr(t, "name", None) == "media_search_assets" for t in tools)
