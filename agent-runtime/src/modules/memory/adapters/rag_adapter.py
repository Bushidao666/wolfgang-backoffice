from __future__ import annotations

from typing import Any

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from modules.memory.repository.fact_repository import FactRepository
from modules.memory.services.embedding_service import EmbeddingService


class RagAdapter:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient | None = None):
        self._db = db
        self._repo = FactRepository(db)
        self._embeddings = EmbeddingService(db=db, redis=redis)

    async def get_relevant_context(
        self,
        *,
        company_id: str,
        lead_id: str,
        query: str,
        top_k: int = 5,
        max_distance: float = 0.35,
    ) -> list[dict[str, Any]]:
        vecs = await self._embeddings.embed(company_id=company_id, texts=[query])
        if not vecs or not vecs[0]:
            return []
        return await self._repo.search_similar(lead_id=lead_id, embedding=vecs[0], limit=top_k, max_distance=max_distance)
