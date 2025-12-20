from __future__ import annotations

from typing import Any

from modules.channels.adapters.base_adapter import NormalizedInboundMessage, PrefixedChannelAdapter
from modules.channels.contracts.events import MessageReceivedPayload


def _extract_instagram_message_id(raw: dict[str, Any]) -> str | None:
    for key in ("message_id", "mid", "id"):
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    data = raw.get("data")
    if isinstance(data, dict):
        key_obj = data.get("key")
        if isinstance(key_obj, dict) and key_obj.get("id") is not None:
            return str(key_obj["id"])
        if data.get("id") is not None:
            return str(data["id"])

        msg_obj = data.get("message")
        if isinstance(msg_obj, dict):
            if msg_obj.get("id") is not None:
                return str(msg_obj["id"])
            if msg_obj.get("mid") is not None:
                return str(msg_obj["mid"])

    return None


def _extract_instagram_text(raw: dict[str, Any]) -> str | None:
    for key in ("text", "body", "message"):
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    # Evolution-style payload (kept in raw for traceability)
    data = raw.get("data")
    if isinstance(data, dict):
        msg_obj = data.get("message")
        if isinstance(msg_obj, dict):
            convo = msg_obj.get("conversation")
            if isinstance(convo, str) and convo.strip():
                return convo.strip()
            extended = msg_obj.get("extendedTextMessage")
            if isinstance(extended, dict):
                txt = extended.get("text")
                if isinstance(txt, str) and txt.strip():
                    return txt.strip()

    return None


class InstagramAdapter(PrefixedChannelAdapter):
    channel_type = "instagram"
    prefix = "instagram:"

    def normalize_inbound(self, payload: MessageReceivedPayload) -> NormalizedInboundMessage:
        normalized = super().normalize_inbound(payload)

        raw = dict(normalized.raw or {})

        if "message_id" not in raw:
            message_id = _extract_instagram_message_id(raw)
            if message_id:
                raw["message_id"] = message_id

        body = normalized.body
        if not body:
            extracted = _extract_instagram_text(raw)
            if extracted:
                body = extracted

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

        if not body and isinstance(normalized.media, dict) and normalized.media.get("type"):
            body = f"[instagram] {normalized.media.get('type')} message"

        if raw != (normalized.raw or {}) or body != normalized.body:
            return NormalizedInboundMessage(
                from_id=normalized.from_id,
                lead_external_id=normalized.lead_external_id,
                body=body,
                media=normalized.media,
                raw=raw,
            )

        return normalized
