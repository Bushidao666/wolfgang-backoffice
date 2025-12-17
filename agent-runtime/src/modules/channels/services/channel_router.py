from __future__ import annotations

from typing import Any

from modules.channels.adapters.base_adapter import BaseChannelAdapter, NormalizedInboundMessage
from modules.channels.adapters.instagram_adapter import InstagramAdapter
from modules.channels.adapters.telegram_adapter import TelegramAdapter


class ChannelRouter:
    def __init__(self) -> None:
        self._adapters: dict[str, BaseChannelAdapter] = {
            "whatsapp": BaseChannelAdapter(),
            "instagram": InstagramAdapter(),
            "telegram": TelegramAdapter(),
        }

    def normalize_inbound(self, *, channel_type: str, payload: dict[str, Any]) -> NormalizedInboundMessage:
        adapter = self._adapters.get(channel_type) or self._adapters["whatsapp"]
        return adapter.normalize_inbound(payload)

