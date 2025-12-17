from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.metrics.prometheus import DOMAIN_EVENTS_TOTAL, MESSAGES_TOTAL


class WhatsAppSender:
    def __init__(self, redis: RedisClient):
        self._redis = redis

    async def send_text(
        self,
        *,
        company_id: str,
        instance_id: str,
        to_number: str,
        text: str,
        correlation_id: str,
        causation_id: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        event = {
            "id": str(uuid.uuid4()),
            "type": "message.sent",
            "version": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "company_id": company_id,
            "source": "agent-runtime",
            "correlation_id": correlation_id,
            "causation_id": causation_id,
            "payload": {
                "instance_id": instance_id,
                "to": to_number,
                "messages": [{"type": "text", "text": text}],
                "raw": metadata or {},
            },
        }

        DOMAIN_EVENTS_TOTAL.labels(type="message.sent").inc()
        MESSAGES_TOTAL.labels(direction="outbound", channel_type="whatsapp", content_type="text").inc()
        await self._redis.publish("message.sent", json.dumps(event, ensure_ascii=False))
