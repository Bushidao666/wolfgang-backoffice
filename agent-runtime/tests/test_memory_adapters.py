import types

import pytest

from modules.memory.adapters.knowledge_base_adapter import KnowledgeBaseAdapter
from modules.memory.adapters.rag_adapter import RagAdapter


class _Db:
    def __init__(self):
        self.fetch_calls: list[tuple[str, tuple[object, ...]]] = []
        self.rows = []

    async def fetch(self, query: str, *args):
        self.fetch_calls.append((query, args))
        return list(self.rows)


@pytest.mark.asyncio
async def test_knowledge_base_adapter_returns_empty_when_no_embedding():
    db = _Db()
    adapter = KnowledgeBaseAdapter(db=db, redis=None)  # type: ignore[arg-type]
    async def embed(*, company_id: str, texts):  # noqa: ARG001
        return [[]]

    adapter._embeddings = types.SimpleNamespace(embed=embed)  # type: ignore[attr-defined]

    out = await adapter.search_knowledge(company_id="co1", query="q")
    assert out == []


@pytest.mark.asyncio
async def test_knowledge_base_adapter_queries_db_when_embedding_available():
    db = _Db()
    db.rows = [{"id": "c1", "content": "x", "metadata": {}, "distance": 0.1, "document_title": "D", "document_path": "p"}]
    adapter = KnowledgeBaseAdapter(db=db, redis=None)  # type: ignore[arg-type]

    async def embed(*, company_id: str, texts):  # noqa: ARG001
        return [[0.1, 0.2]]

    adapter._embeddings = types.SimpleNamespace(embed=embed)  # type: ignore[attr-defined]

    out = await adapter.search_knowledge(company_id="co1", query="q", top_k=1, max_distance=0.5)
    assert out[0]["document_title"] == "D"
    assert db.fetch_calls


@pytest.mark.asyncio
async def test_rag_adapter_returns_empty_when_no_embedding():
    db = _Db()
    adapter = RagAdapter(db=db, redis=None)  # type: ignore[arg-type]
    async def embed(*, company_id: str, texts):  # noqa: ARG001
        return [[]]

    async def search_similar(**k):  # noqa: ARG001
        return []

    adapter._embeddings = types.SimpleNamespace(embed=embed)  # type: ignore[attr-defined]
    adapter._repo = types.SimpleNamespace(search_similar=search_similar)  # type: ignore[attr-defined]

    out = await adapter.get_relevant_context(company_id="co1", lead_id="l1", query="q")
    assert out == []
