import json
import types

import pytest

from modules.memory.services.embedding_service import EmbeddingService, format_vector


class _FakeRedis:
    def __init__(self):
        self.kv: dict[str, str] = {}
        self.set_calls: list[tuple[str, str, int | None]] = []

    async def get(self, key: str):
        return self.kv.get(key)

    async def set(self, key: str, value: str, *, ttl_s: int | None = None):
        self.kv[key] = value
        self.set_calls.append((key, value, ttl_s))


@pytest.mark.asyncio
async def test_embedding_service_uses_cache_and_calls_openai_for_missing(monkeypatch):
    settings = types.SimpleNamespace(
        openai_api_key="k",
        openai_base_url="https://example.test",
        openai_embedding_model="emb",
    )
    monkeypatch.setattr("modules.memory.services.embedding_service.get_settings", lambda: settings)

    class _EmbItem:
        def __init__(self, embedding):
            self.embedding = embedding

    class _EmbRes:
        def __init__(self, data):
            self.data = data

    class _Embeddings:
        async def create(self, *, model: str, input: list[str]):  # noqa: ARG002
            return _EmbRes([_EmbItem([0.9, 0.8]) for _ in input])

    class _FakeOpenAI:
        def __init__(self, *, api_key: str, base_url: str):  # noqa: ARG002
            self.embeddings = _Embeddings()

    monkeypatch.setattr("modules.memory.services.embedding_service.AsyncOpenAI", _FakeOpenAI)

    redis = _FakeRedis()
    svc = EmbeddingService(redis=redis)  # type: ignore[arg-type]

    hello_key = svc._cache_key(company_id="c1", model="emb", text="hello")  # noqa: SLF001
    redis.kv[hello_key] = json.dumps([0.1, 0.2])

    vecs = await svc.embed(company_id="c1", texts=["hello", "world", ""])
    assert vecs[0] == [0.1, 0.2]
    assert vecs[1] == [0.9, 0.8]
    assert vecs[2] == []
    assert any(k.startswith("emb:") for k, _, _ in redis.set_calls)


def test_format_vector():
    assert format_vector([1.0, 2.5]) == "[1.00000000,2.50000000]"
