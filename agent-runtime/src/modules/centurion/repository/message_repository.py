from __future__ import annotations

from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb
from modules.centurion.domain.message import Message


class MessageRepository:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def save_message(
        self,
        *,
        conversation_id: str,
        company_id: str,
        lead_id: str,
        direction: str,
        content_type: str,
        content: str | None,
        channel_message_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        row = await self._db.fetchrow(
            """
            insert into core.messages (
              conversation_id, company_id, lead_id,
              direction, content_type, content,
              channel_message_id, metadata
            )
            values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::jsonb, '{}'::jsonb))
            returning id
            """,
            conversation_id,
            company_id,
            lead_id,
            direction,
            content_type,
            content,
            channel_message_id,
            metadata or {},
        )
        return str(row["id"])

    async def set_media_enrichment(
        self,
        *,
        message_id: str,
        audio_transcription: str | None = None,
        image_description: str | None = None,
    ) -> None:
        await self._db.execute(
            """
            update core.messages
            set audio_transcription = coalesce($2, audio_transcription),
                image_description = coalesce($3, image_description)
            where id=$1
            """,
            message_id,
            audio_transcription,
            image_description,
        )

    async def list_recent(self, *, conversation_id: str, limit: int) -> list[Message]:
        rows = await self._db.fetch(
            """
            select *
            from core.messages
            where conversation_id=$1
            order by created_at desc
            limit $2
            """,
            conversation_id,
            limit,
        )
        messages = [self._map(r) for r in rows]
        messages.reverse()
        return messages

    def _map(self, row: Any) -> Message:
        return Message(
            id=str(row["id"]),
            conversation_id=str(row["conversation_id"]),
            company_id=str(row["company_id"]),
            lead_id=str(row["lead_id"]),
            direction=row.get("direction"),
            content_type=row.get("content_type"),
            content=row.get("content"),
            audio_transcription=row.get("audio_transcription"),
            image_description=row.get("image_description"),
            channel_message_id=row.get("channel_message_id"),
            metadata=dict(row.get("metadata") or {}),
            created_at=row.get("created_at"),
        )

