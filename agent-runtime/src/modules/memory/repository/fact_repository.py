from __future__ import annotations

from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb
from modules.memory.domain.fact import Fact
from modules.memory.services.embedding_service import format_vector


class FactRepository:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def save_fact(
        self,
        *,
        company_id: str,
        lead_id: str,
        fact: Fact,
        embedding: list[float],
    ) -> str:
        existing = await self._db.fetchrow(
            "select id from core.lead_memories where lead_id=$1 and summary=$2 limit 1",
            lead_id,
            fact.text,
        )
        if existing:
            return str(existing["id"])

        vec = format_vector(embedding)
        row = await self._db.fetchrow(
            """
            insert into core.lead_memories (company_id, lead_id, facts, embeddings, summary, last_updated_at)
            values ($1, $2, $3::jsonb, $4::vector, $5, now())
            returning id
            """,
            company_id,
            lead_id,
            [{"text": fact.text, "category": fact.category}],
            vec,
            fact.text,
        )
        return str(row["id"])

    async def search_similar(
        self,
        *,
        lead_id: str,
        embedding: list[float],
        limit: int = 5,
        max_distance: float = 0.35,
    ) -> list[dict[str, Any]]:
        vec = format_vector(embedding)
        rows = await self._db.fetch(
            """
            select
              id,
              summary,
              facts,
              (embeddings <=> $1::vector) as distance
            from core.lead_memories
            where lead_id=$2
              and embeddings is not null
              and (embeddings <=> $1::vector) <= $3
            order by embeddings <=> $1::vector asc
            limit $4
            """,
            vec,
            lead_id,
            max_distance,
            limit,
        )
        return [dict(r) for r in rows]
