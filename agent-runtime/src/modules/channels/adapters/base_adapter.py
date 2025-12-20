from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from modules.channels.contracts.events import MessageReceivedPayload


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


@dataclass(frozen=True)
class ChannelCapabilities:
    outbound_message_types: frozenset[str]

    def supports_outbound_type(self, message_type: str) -> bool:
        return message_type in self.outbound_message_types


class BaseChannelAdapter:
    channel_type: str = "whatsapp"
    capabilities = ChannelCapabilities(outbound_message_types=frozenset({"text", "image", "video", "audio", "document"}))

    def normalize_sender(self, sender: str) -> str:
        return sender

    def normalize_inbound(self, payload: MessageReceivedPayload) -> NormalizedInboundMessage:
        sender = self.normalize_sender(str(payload.from_ or ""))
        lead_external_id = self.normalize_sender(str(payload.lead_external_id or sender or ""))

        body = payload.body
        if body is not None and not isinstance(body, str):
            body = str(body)

        media = payload.media.model_dump() if payload.media else None
        raw = payload.raw if isinstance(payload.raw, dict) else {}

        return NormalizedInboundMessage(
            from_id=sender,
            lead_external_id=lead_external_id,
            body=body,
            media=media,
            raw=raw,
        )

    def filter_outbound(self, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        allowed: list[dict[str, Any]] = []
        for msg in messages or []:
            if not isinstance(msg, dict):
                continue
            msg_type = msg.get("type")
            if not isinstance(msg_type, str) or not msg_type:
                continue
            if self.capabilities.supports_outbound_type(msg_type):
                allowed.append(msg)
        return allowed


class PrefixedChannelAdapter(BaseChannelAdapter):
    prefix: str = ""
    capabilities = ChannelCapabilities(outbound_message_types=frozenset({"text"}))

    def normalize_sender(self, sender: str) -> str:
        return _ensure_prefix(sender, self.prefix)
