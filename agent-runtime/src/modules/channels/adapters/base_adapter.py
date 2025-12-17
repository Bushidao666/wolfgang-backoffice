from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class NormalizedInboundMessage:
    from_id: str
    lead_external_id: str
    body: str | None
    media: dict[str, Any] | None
    raw: dict[str, Any]


def _ensure_prefix(value: str, prefix: str) -> str:
    if not value:
        return value
    return value if value.startswith(prefix) else f"{prefix}{value}"


class BaseChannelAdapter:
    channel_type: str = "whatsapp"

    def normalize_sender(self, sender: str) -> str:
        return sender

    def normalize_inbound(self, payload: dict[str, Any]) -> NormalizedInboundMessage:
        sender = self.normalize_sender(str(payload.get("from") or ""))
        lead_external_id = str(payload.get("lead_external_id") or sender or "")
        body = payload.get("body")
        if body is not None and not isinstance(body, str):
            body = str(body)

        media = payload.get("media") if isinstance(payload.get("media"), dict) else None
        raw = payload.get("raw") if isinstance(payload.get("raw"), dict) else {}

        return NormalizedInboundMessage(
            from_id=sender,
            lead_external_id=lead_external_id,
            body=body,
            media=media,
            raw=raw,
        )


class PrefixedChannelAdapter(BaseChannelAdapter):
    prefix: str = ""

    def normalize_sender(self, sender: str) -> str:
        return _ensure_prefix(sender, self.prefix)

