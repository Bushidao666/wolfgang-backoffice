from __future__ import annotations

from typing import Any

from modules.channels.adapters.base_adapter import NormalizedInboundMessage, PrefixedChannelAdapter


class TelegramAdapter(PrefixedChannelAdapter):
    channel_type = "telegram"
    prefix = "telegram:"

    def normalize_inbound(self, payload: dict[str, Any]) -> NormalizedInboundMessage:
        normalized = super().normalize_inbound(payload)

        text = normalized.body or ""
        if text.startswith("/") and text.strip():
            # Treat Telegram commands as normal text, but keep a hint in raw for downstream logic.
            raw = dict(normalized.raw or {})
            raw.setdefault("telegram", {})
            if isinstance(raw["telegram"], dict):
                raw["telegram"]["command"] = text.split()[0]
            return NormalizedInboundMessage(
                from_id=normalized.from_id,
                lead_external_id=normalized.lead_external_id,
                body=text,
                media=normalized.media,
                raw=raw,
            )

        return normalized

