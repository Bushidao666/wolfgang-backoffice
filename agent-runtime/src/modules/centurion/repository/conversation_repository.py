from __future__ import annotations

from datetime import datetime
from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb
from modules.centurion.domain.conversation import Conversation


class ConversationRepository:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def get_or_create(
        self,
        *,
        company_id: str,
        lead_id: str,
        centurion_id: str,
        channel_type: str,
        channel_instance_id: str | None,
    ) -> Conversation:
        row = await self._db.fetchrow(
            """
            select *
            from core.conversations
            where company_id=$1 and lead_id=$2 and centurion_id=$3 and channel_type=$4
              and ($5::uuid is null or channel_instance_id=$5::uuid)
            order by created_at desc
            limit 1
            """,
            company_id,
            lead_id,
            centurion_id,
            channel_type,
            channel_instance_id,
        )
        if row:
            return self._map(row)

        row = await self._db.fetchrow(
            """
            insert into core.conversations (company_id, lead_id, centurion_id, channel_instance_id, channel_type)
            values ($1, $2, $3, $4, $5)
            returning *
            """,
            company_id,
            lead_id,
            centurion_id,
            channel_instance_id,
            channel_type,
        )
        return self._map(row)

    async def update_debounce(
        self,
        *,
        conversation_id: str,
        state: str,
        until: datetime | None,
        pending_messages: list[str],
        last_inbound_at: datetime | None,
    ) -> None:
        await self._db.execute(
            """
            update core.conversations
            set
              debounce_state=$2,
              debounce_until=$3,
              pending_messages=$4::jsonb,
              last_inbound_at=coalesce($5, last_inbound_at),
              updated_at=now()
            where id=$1
            """,
            conversation_id,
            state,
            until,
            pending_messages,
            last_inbound_at,
        )

    async def mark_processing(self, conversation_id: str) -> None:
        await self._db.execute(
            "update core.conversations set debounce_state='processing', updated_at=now() where id=$1",
            conversation_id,
        )

    async def clear_pending(self, conversation_id: str) -> None:
        await self._db.execute(
            """
            update core.conversations
            set debounce_state='idle', debounce_until=null, pending_messages='[]'::jsonb, updated_at=now()
            where id=$1
            """,
            conversation_id,
        )

    async def find_due_conversations(self, *, limit: int = 20) -> list[Conversation]:
        rows = await self._db.fetch(
            """
            select *
            from core.conversations
            where debounce_state='waiting'
              and debounce_until is not null
              and debounce_until <= now()
            order by debounce_until asc
            limit $1
            """,
            limit,
        )
        return [self._map(r) for r in rows]

    def _map(self, row: Any) -> Conversation:
        return Conversation(
            id=str(row["id"]),
            company_id=str(row["company_id"]),
            lead_id=str(row["lead_id"]),
            centurion_id=str(row["centurion_id"]),
            channel_instance_id=str(row["channel_instance_id"]) if row.get("channel_instance_id") else None,
            channel_type=row.get("channel_type") or "whatsapp",
            debounce_state=row.get("debounce_state") or "idle",
            debounce_until=row.get("debounce_until"),
            pending_messages=list(row.get("pending_messages") or []),
            last_inbound_at=row.get("last_inbound_at"),
            last_outbound_at=row.get("last_outbound_at"),
            metadata=dict(row.get("metadata") or {}),
        )

