from __future__ import annotations

from typing import Any

from modules.channels.adapters.base_adapter import NormalizedInboundMessage, PrefixedChannelAdapter
from modules.channels.contracts.events import MessageReceivedPayload


def _extract_telegram_message_id(raw: dict[str, Any]) -> str | None:
    if isinstance(raw.get("message_id"), str) and raw["message_id"].strip():
        return raw["message_id"].strip()

    update = raw.get("update")
    if not isinstance(update, dict):
        return None

    message = update.get("message") if isinstance(update.get("message"), dict) else None
    edited = update.get("edited_message") if isinstance(update.get("edited_message"), dict) else None
    msg = message or edited
    if msg and msg.get("message_id") is not None:
        return str(msg["message_id"])

    if update.get("update_id") is not None:
        return str(update["update_id"])

    return None


def _extract_telegram_text(raw: dict[str, Any]) -> str | None:
    update = raw.get("update")
    if not isinstance(update, dict):
        return None

    message = update.get("message") if isinstance(update.get("message"), dict) else None
    edited = update.get("edited_message") if isinstance(update.get("edited_message"), dict) else None
    msg = message or edited
    if not msg:
        return None

    text = msg.get("text")
    if isinstance(text, str) and text.strip():
        return text.strip()

    caption = msg.get("caption")
    if isinstance(caption, str) and caption.strip():
        return caption.strip()

    return None


class TelegramAdapter(PrefixedChannelAdapter):
    channel_type = "telegram"
    prefix = "telegram:"

    def normalize_inbound(self, payload: MessageReceivedPayload) -> NormalizedInboundMessage:
        normalized = super().normalize_inbound(payload)

        raw = dict(normalized.raw or {})

        if "message_id" not in raw:
            message_id = _extract_telegram_message_id(raw)
            if message_id:
                raw["message_id"] = message_id

        body = normalized.body
        if not body:
            extracted = _extract_telegram_text(raw)
            if extracted:
                body = extracted

        if isinstance(body, str):
            text = body.strip()
            if text.startswith("/") and text:
                raw.setdefault("telegram", {})
                if isinstance(raw["telegram"], dict):
                    raw["telegram"]["command"] = text.split()[0]
                body = text

        if raw != (normalized.raw or {}) or body != normalized.body:
            return NormalizedInboundMessage(
                from_id=normalized.from_id,
                lead_external_id=normalized.lead_external_id,
                body=body,
                media=normalized.media,
                raw=raw,
            )

        return normalized
