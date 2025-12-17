from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class Conversation:
    id: str
    company_id: str
    lead_id: str
    centurion_id: str
    channel_type: str
    channel_instance_id: str | None = None

    debounce_state: str = "idle"
    debounce_until: datetime | None = None
    pending_messages: list[str] = field(default_factory=list)

    last_inbound_at: datetime | None = None
    last_outbound_at: datetime | None = None

    metadata: dict[str, Any] = field(default_factory=dict)

    def append_pending(self, content: str, *, until: datetime) -> "Conversation":
        pending = list(self.pending_messages or [])
        pending.append(content)
        return Conversation(
            id=self.id,
            company_id=self.company_id,
            lead_id=self.lead_id,
            centurion_id=self.centurion_id,
            channel_type=self.channel_type,
            channel_instance_id=self.channel_instance_id,
            debounce_state="waiting",
            debounce_until=until,
            pending_messages=pending,
            last_inbound_at=datetime.utcnow(),
            last_outbound_at=self.last_outbound_at,
            metadata=self.metadata,
        )

    def mark_processing(self) -> "Conversation":
        return Conversation(
            **{**self.__dict__, "debounce_state": "processing"},
        )

    def clear_pending(self) -> "Conversation":
        return Conversation(
            **{**self.__dict__, "pending_messages": [], "debounce_state": "idle", "debounce_until": None},
        )

