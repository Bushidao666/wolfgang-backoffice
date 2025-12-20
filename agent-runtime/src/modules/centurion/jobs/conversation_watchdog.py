from __future__ import annotations

import asyncio
import logging

from common.config.settings import get_settings
from common.infrastructure.database.supabase_client import SupabaseDb

logger = logging.getLogger(__name__)


class ConversationWatchdog:
    def __init__(self, *, db: SupabaseDb):
        self._db = db

    async def run_forever(self) -> None:
        settings = get_settings()
        interval_s = float(getattr(settings, "watchdog_poll_interval_s", 10.0) or 10.0)
        while True:
            try:
                await self._tick()
            except Exception:
                logger.exception("watchdog.tick_failed")
            await asyncio.sleep(interval_s)

    async def _tick(self) -> None:
        settings = get_settings()
        stuck_after_s = int(getattr(settings, "watchdog_stuck_after_s", 120) or 120)
        limit = int(getattr(settings, "watchdog_batch_size", 50) or 50)

        rows = await self._db.fetch(
            """
            select id, pending_messages
            from core.conversations
            where debounce_state='processing'
              and updated_at < now() - ($1::int * interval '1 second')
            order by updated_at asc
            limit $2
            """,
            stuck_after_s,
            limit,
        )

        for row in rows or []:
            conv_id = str(row.get("id"))
            pending = list(row.get("pending_messages") or [])
            if not conv_id:
                continue

            if pending:
                await self._db.execute(
                    """
                    update core.conversations
                    set debounce_state='waiting',
                        debounce_until=now(),
                        updated_at=now()
                    where id=$1
                    """,
                    conv_id,
                )
                logger.warning("watchdog.recovered_to_waiting", extra={"extra": {"conversation_id": conv_id, "pending_count": len(pending)}})
            else:
                await self._db.execute(
                    """
                    update core.conversations
                    set debounce_state='idle',
                        debounce_until=null,
                        pending_messages='[]'::jsonb,
                        updated_at=now()
                    where id=$1
                    """,
                    conv_id,
                )
                logger.warning("watchdog.recovered_to_idle", extra={"extra": {"conversation_id": conv_id}})

