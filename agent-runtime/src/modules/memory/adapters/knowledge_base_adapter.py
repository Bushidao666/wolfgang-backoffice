from __future__ import annotations

from typing import Any

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from modules.memory.services.embedding_service import EmbeddingService, format_vector


class KnowledgeBaseAdapter:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient | None = None):
        self._db = db
        self._embeddings = EmbeddingService(db=db, redis=redis)

    async def search_knowledge(
        self,
        *,
        company_id: str,
        query: str,
        top_k: int = 5,
        max_distance: float = 0.35,
    ) -> list[dict[str, Any]]:
        vecs = await self._embeddings.embed(company_id=company_id, texts=[query])
        if not vecs or not vecs[0]:
            return []

        vec = format_vector(vecs[0])
        rows = await self._db.fetch(
            """
            select
              kc.id,
              kc.content,
              kc.metadata,
              (kc.embedding <=> $1::vector) as distance,
              kd.title as document_title,
              kd.file_path as document_path
            from core.knowledge_chunks kc
            join core.knowledge_documents kd on kd.id = kc.document_id
            where kc.company_id=$2
              and kc.embedding is not null
              and (kc.embedding <=> $1::vector) <= $3
              and kd.status = 'ready'
            order by kc.embedding <=> $1::vector asc
            limit $4
            """,
            vec,
            company_id,
            max_distance,
            top_k,
        )
        return [dict(r) for r in rows]
