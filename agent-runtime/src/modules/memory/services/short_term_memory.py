from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from modules.centurion.domain.message import Message
from modules.centurion.repository.message_repository import MessageRepository

logger = logging.getLogger(__name__)

_DEFAULT_CACHE_TTL_S = 60
_HISTORY_LIMITS_TO_INVALIDATE = (10, 15, 25)


class ShortTermMemory:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._repo = MessageRepository(db)

    async def get_conversation_history(self, *, conversation_id: str, limit: int | None = None) -> list[Message]:
        if limit is None:
            limit = await self._recommended_history_limit(conversation_id)

        key = f"conv:{conversation_id}:history:{limit}"
        cached = await self._redis.get_json(key)
        if isinstance(cached, list):
            try:
                return [self._from_dict(d) for d in cached if isinstance(d, dict)]
            except Exception:
                logger.warning("short_term_memory.cache_invalid", extra={"extra": {"conversation_id": conversation_id}})

        messages = await self._repo.list_recent(conversation_id=conversation_id, limit=limit, include_archived=False)
        await self._redis.set_json(key, [self._to_dict(m) for m in messages], ttl_s=_DEFAULT_CACHE_TTL_S)
        return messages

    async def invalidate_cache(self, conversation_id: str) -> None:
        for limit in _HISTORY_LIMITS_TO_INVALIDATE:
            await self._redis.delete(f"conv:{conversation_id}:history:{limit}")

    async def _recommended_history_limit(self, conversation_id: str) -> int:
        try:
            row = await self._db.fetchrow(
                "select metadata->'agno_session' as agno_session from core.conversations where id=$1::uuid",
                conversation_id,
            )
            agno_session = row.get("agno_session") if row else None
            if isinstance(agno_session, dict) and agno_session.get("summary"):
                return 15
        except Exception:
            logger.exception(
                "short_term_memory.summary_lookup_failed",
                extra={"extra": {"conversation_id": conversation_id}},
            )
        return 25

    def _to_dict(self, m: Message) -> dict[str, Any]:
        return {
            "id": m.id,
            "conversation_id": m.conversation_id,
            "company_id": m.company_id,
            "lead_id": m.lead_id,
            "direction": m.direction,
            "content_type": m.content_type,
            "content": m.content,
            "audio_transcription": m.audio_transcription,
            "image_description": m.image_description,
            "channel_message_id": m.channel_message_id,
            "metadata": m.metadata,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }

    def _from_dict(self, d: dict[str, Any]) -> Message:
        created_at: datetime | None = None
        raw_created_at = d.get("created_at")
        if isinstance(raw_created_at, str) and raw_created_at.strip():
            iso = raw_created_at.strip()
            if iso.endswith("Z"):
                iso = iso[:-1] + "+00:00"
            try:
                created_at = datetime.fromisoformat(iso)
            except Exception:
                created_at = None

        return Message(
            id=str(d.get("id")),
            conversation_id=str(d.get("conversation_id")),
            company_id=str(d.get("company_id")),
            lead_id=str(d.get("lead_id")),
            direction=str(d.get("direction")),
            content_type=str(d.get("content_type")),
            content=d.get("content"),
            audio_transcription=d.get("audio_transcription"),
            image_description=d.get("image_description"),
            channel_message_id=d.get("channel_message_id"),
            metadata=dict(d.get("metadata") or {}),
            created_at=created_at,
        )
