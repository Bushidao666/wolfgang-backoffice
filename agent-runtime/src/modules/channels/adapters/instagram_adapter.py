from __future__ import annotations

from typing import Any

from modules.channels.adapters.base_adapter import NormalizedInboundMessage, PrefixedChannelAdapter


class InstagramAdapter(PrefixedChannelAdapter):
    channel_type = "instagram"
    prefix = "instagram:"

    def normalize_inbound(self, payload: dict[str, Any]) -> NormalizedInboundMessage:
        normalized = super().normalize_inbound(payload)

        # Best-effort handling for IG-specific message types that may arrive without "body".
        raw = normalized.raw or {}
        if normalized.body:
            return normalized

        # Common patterns for IG webhooks/providers
        if raw.get("is_story") or raw.get("story") or raw.get("story_mention"):
            return NormalizedInboundMessage(
                from_id=normalized.from_id,
                lead_external_id=normalized.lead_external_id,
                body="[instagram] story mention",
                media=normalized.media,
                raw=raw,
            )

        if raw.get("is_mention") or raw.get("mention"):
            return NormalizedInboundMessage(
                from_id=normalized.from_id,
                lead_external_id=normalized.lead_external_id,
                body="[instagram] mention",
                media=normalized.media,
                raw=raw,
            )

        return normalized

