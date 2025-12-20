from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from modules.channels.adapters.base_adapter import BaseChannelAdapter, ChannelCapabilities, NormalizedInboundMessage
from modules.channels.adapters.instagram_adapter import InstagramAdapter
from modules.channels.adapters.telegram_adapter import TelegramAdapter
from modules.channels.contracts.events import MessageReceivedPayload

logger = logging.getLogger(__name__)


class ChannelRouter:
    def __init__(self) -> None:
        self._adapters: dict[str, BaseChannelAdapter] = {
            "whatsapp": BaseChannelAdapter(),
            "instagram": InstagramAdapter(),
            "telegram": TelegramAdapter(),
        }

    def normalize_inbound(self, *, channel_type: str, payload: dict[str, Any]) -> NormalizedInboundMessage:
        adapter = self._adapters.get(channel_type) or self._adapters["whatsapp"]
        try:
            parsed = MessageReceivedPayload.model_validate(payload)
        except ValidationError as err:
            logger.warning(
                "channel_router.invalid_payload",
                extra={"extra": {"channel_type": channel_type, "errors": err.errors()[:3]}},
            )
            minimal = {
                "instance_id": str(payload.get("instance_id") or ""),
                "from": str(payload.get("from") or ""),
                "lead_external_id": str(payload.get("lead_external_id") or payload.get("from") or ""),
                "body": payload.get("body"),
                "media": payload.get("media"),
                "raw": payload.get("raw") if isinstance(payload.get("raw"), dict) else {},
            }
            parsed = MessageReceivedPayload.model_validate(minimal)

        return adapter.normalize_inbound(parsed)

    def get_capabilities(self, *, channel_type: str) -> ChannelCapabilities:
        adapter = self._adapters.get(channel_type) or self._adapters["whatsapp"]
        return adapter.capabilities

    def filter_outbound(self, *, channel_type: str, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        adapter = self._adapters.get(channel_type) or self._adapters["whatsapp"]
        filtered = adapter.filter_outbound(messages)
        dropped = (len(messages or []) - len(filtered)) if messages else 0
        if dropped > 0:
            logger.info(
                "channel_router.outbound_filtered",
                extra={"extra": {"channel_type": channel_type, "dropped": dropped}},
            )
        return filtered
