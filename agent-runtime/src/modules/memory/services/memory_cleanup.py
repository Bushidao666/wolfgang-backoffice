from __future__ import annotations

import asyncio
import logging

from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb

logger = logging.getLogger(__name__)


class MemoryCleanupWorker:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis

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
        logger.info("memory_cleanup.completed")

