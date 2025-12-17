from __future__ import annotations

import logging
from typing import Any

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from modules.centurion.domain.message import Message
from modules.centurion.repository.message_repository import MessageRepository

logger = logging.getLogger(__name__)


class ShortTermMemory:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._repo = MessageRepository(db)

    async def get_conversation_history(self, *, conversation_id: str, limit: int = 25) -> list[Message]:
        key = f"conv:{conversation_id}:history:{limit}"
        cached = await self._redis.get_json(key)
        if isinstance(cached, list):
            try:
                return [self._from_dict(d) for d in cached if isinstance(d, dict)]
            except Exception:
                logger.warning("short_term_memory.cache_invalid", extra={"extra": {"conversation_id": conversation_id}})

        messages = await self._repo.list_recent(conversation_id=conversation_id, limit=limit)
        await self._redis.set_json(key, [self._to_dict(m) for m in messages], ttl_s=60)
        return messages

    async def invalidate_cache(self, conversation_id: str) -> None:
        for limit in (25,):
            await self._redis.delete(f"conv:{conversation_id}:history:{limit}")

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
            created_at=None,
        )

