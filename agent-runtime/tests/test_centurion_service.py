import json

import pytest

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

