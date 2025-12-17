from __future__ import annotations

import asyncio
import logging

from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from modules.centurion.repository.conversation_repository import ConversationRepository
from modules.centurion.services.centurion_service import CenturionService

logger = logging.getLogger(__name__)


class DebounceWorker:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._conversations = ConversationRepository(db)
        self._centurion = CenturionService(db=db, redis=redis)

    async def run_forever(self) -> None:
        settings = get_settings()
        while True:
            try:
                await self._tick()
            except Exception:
                logger.exception("debounce.tick_failed")
            await asyncio.sleep(settings.debounce_poll_interval_s)

    async def _tick(self) -> None:
        due = await self._conversations.find_due_conversations(limit=20)
        if not due:
            return
        for conv in due:
            await self._centurion.process_due_conversation(conv.id, causation_id=conv.id)

