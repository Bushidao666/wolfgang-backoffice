from __future__ import annotations

import asyncio
import logging

from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.idempotency.idempotency_store import IdempotencyStore

logger = logging.getLogger(__name__)


class MemoryCleanupWorker:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._idempotency = IdempotencyStore(db)

    async def run_forever(self) -> None:
        settings = get_settings()
        while True:
            try:
                await self._cleanup()
            except Exception:
                logger.exception("memory_cleanup.failed")
            await asyncio.sleep(settings.cleanup_interval_s)

    async def _cleanup(self) -> None:
        # Marca mensagens antigas como "archived" na metadata, mantendo histórico para auditoria.
        await self._db.execute(
            """
            update core.messages m
            set metadata = coalesce(m.metadata, '{}'::jsonb) || '{"archived": true}'::jsonb
            where m.created_at < now() - interval '30 days'
              and not (coalesce(m.metadata, '{}'::jsonb) ? 'archived')
              and m.conversation_id in (
                select c.id
                from core.conversations c
                where coalesce(c.last_inbound_at, c.last_outbound_at, c.created_at) < now() - interval '30 days'
              )
            """,
        )

        # Remove session blobs de conversas antigas para manter metadata pequena.
        # A memória canônica fica em `core.messages` e `core.lead_memories`.
        await self._db.execute(
            """
            update core.conversations c
            set metadata = coalesce(c.metadata, '{}'::jsonb) - 'agno_session',
                updated_at=now()
            where coalesce(c.last_inbound_at, c.last_outbound_at, c.created_at) < now() - interval '90 days'
              and (coalesce(c.metadata, '{}'::jsonb) ? 'agno_session')
            """,
        )

        # Prune de user memories geradas pelo Agno (evita crescimento infinito).
        await self._db.execute(
            """
            delete from core.lead_memories lm
            where (coalesce(lm.qualification_context, '{}'::jsonb) ? 'agno')
              and coalesce(lm.last_updated_at, lm.created_at) < now() - interval '180 days'
            """,
        )

        deleted = await self._idempotency.cleanup_expired(limit=5000)
        if deleted:
            logger.info("idempotency.cleanup_deleted", extra={"extra": {"deleted": deleted}})

        logger.info("memory_cleanup.completed")
