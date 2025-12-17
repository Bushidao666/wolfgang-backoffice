from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class Message:
    id: str
    conversation_id: str
    company_id: str
    lead_id: str
    direction: str  # inbound|outbound
    content_type: str  # text|audio|image|document
    content: str | None = None
    audio_transcription: str | None = None
    image_description: str | None = None
    channel_message_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None

    @property
    def as_prompt_text(self) -> str:
        if self.content:
            return self.content
        if self.audio_transcription:
            return f"[ÁUDIO] {self.audio_transcription}"
        if self.image_description:
            return f"[IMAGEM] {self.image_description}"
        return ""

