from __future__ import annotations

import asyncio
import logging

from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.locks.redis_lock import RedisLockManager
from modules.centurion.repository.conversation_repository import ConversationRepository
from modules.centurion.services.centurion_service import CenturionService

logger = logging.getLogger(__name__)


class DebounceWorker:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._conversations = ConversationRepository(db)
        self._centurion = CenturionService(db=db, redis=redis)
        self._locks = RedisLockManager(redis, prefix="locks:conversation:")

    async def run_forever(self) -> None:
        settings = get_settings()
        while True:
            try:
                await self._tick()
            except Exception:
                logger.exception("debounce.tick_failed")
            await asyncio.sleep(settings.debounce_poll_interval_s)

    async def _tick(self) -> None:
        settings = get_settings()
        due = await self._conversations.find_due_conversations(limit=20)
        if not due:
            return
        for conv in due:
            async with self._locks.hold(
                conv.id,
                ttl_s=settings.debounce_lock_ttl_s,
                refresh_every_s=settings.debounce_lock_refresh_s,
            ) as acquired:
                if not acquired:
                    continue
                await self._centurion.process_due_conversation(conv.id)
