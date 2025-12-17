from __future__ import annotations

import asyncio
import logging

from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from modules.followups.services.followup_service import FollowupService

logger = logging.getLogger(__name__)


class ProactiveHandler:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._followups = FollowupService(db=db, redis=redis)

    async def run_forever(self) -> None:
        settings = get_settings()
        while True:
            try:
                processed = await self._followups.process_due(limit=20)
                if processed:
                    logger.info("followup.processed", extra={"count": processed})
            except Exception:
                logger.exception("followup.tick_failed")
            await asyncio.sleep(settings.followup_poll_interval_s)

