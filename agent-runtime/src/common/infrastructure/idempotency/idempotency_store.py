from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb


@dataclass(frozen=True)
class IdempotencyKey:
    consumer: str
    key: str

    @property
    def dedupe_key(self) -> str:
        return self.key[:512]


class IdempotencyStore:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def claim(
        self,
        *,
        company_id: str,
        consumer: str,
        key: str,
        ttl_seconds: int,
        event_type: str | None = None,
        event_id: str | None = None,
        correlation_id: str | None = None,
        causation_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        ttl_seconds = max(30, int(ttl_seconds))
        dedupe_key = str(key)[:512]
        meta = metadata or {}

        payload_hash = None
        try:
            payload_hash = hashlib.sha256(str(meta).encode("utf-8")).hexdigest()
        except Exception:
            payload_hash = None

        row = await self._db.fetchrow(
            """
            insert into core.event_consumptions (
              company_id,
              consumer,
              dedupe_key,
              event_type,
              event_id,
              correlation_id,
              causation_id,
              metadata,
              expires_at
            )
            values (
              $1::uuid,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              coalesce($8::jsonb, '{}'::jsonb) || jsonb_build_object('payload_hash', $9),
              now() + ($10::int * interval '1 second')
            )
            on conflict (company_id, consumer, dedupe_key) do update
            set
              event_type=excluded.event_type,
              event_id=excluded.event_id,
              correlation_id=excluded.correlation_id,
              causation_id=excluded.causation_id,
              metadata=excluded.metadata,
              expires_at=excluded.expires_at
            where core.event_consumptions.expires_at <= now()
            returning id
            """,
            company_id,
            consumer,
            dedupe_key,
            event_type,
            event_id,
            correlation_id,
            causation_id,
            meta,
            payload_hash,
            ttl_seconds,
        )

        return bool(row and row.get("id"))

    async def release(self, *, company_id: str, consumer: str, key: str) -> None:
        dedupe_key = str(key)[:512]
        await self._db.execute(
            """
            delete from core.event_consumptions
            where company_id=$1::uuid
              and consumer=$2
              and dedupe_key=$3
            """,
            company_id,
            consumer,
            dedupe_key,
        )

    async def cleanup_expired(self, *, limit: int = 1000) -> int:
        limit = max(1, int(limit))
        rows = await self._db.fetch(
            """
            with doomed as (
              select id
              from core.event_consumptions
              where expires_at is not null and expires_at <= now()
              order by expires_at asc
              limit $1
            )
            delete from core.event_consumptions c
            using doomed
            where c.id = doomed.id
            returning c.id
            """,
            limit,
        )
        return len(rows or [])
