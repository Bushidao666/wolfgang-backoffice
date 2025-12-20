from __future__ import annotations

import json
from typing import Any

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.events.envelope import build_envelope
from common.infrastructure.idempotency.idempotency_store import IdempotencyStore
from common.infrastructure.metrics.prometheus import DOMAIN_EVENTS_TOTAL, MESSAGES_TOTAL


class WhatsAppSender:
    def __init__(self, redis: RedisClient, *, idempotency: IdempotencyStore | None = None):
        self._redis = redis
        self._idempotency = idempotency

    async def send_message(
        self,
        *,
        company_id: str,
        instance_id: str,
        to_number: str,
        message: dict[str, Any],
        channel_type: str = "whatsapp",
        correlation_id: str,
        causation_id: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        msg_type = message.get("type")
        if msg_type == "text":
            return await self.send_text(
                company_id=company_id,
                instance_id=instance_id,
                to_number=to_number,
                text=str(message.get("text") or ""),
                correlation_id=correlation_id,
                causation_id=causation_id,
                metadata=metadata,
            )

        if msg_type not in ("audio", "image", "video", "document"):
            raise ValueError(f"Unsupported outbound message type: {msg_type}")

        meta = metadata or {}
        chunk_index = meta.get("chunk_index")
        if not isinstance(chunk_index, int):
            chunk_index = 0

        consumer = "agent-runtime:message.sent"
        dedupe_key = f"{correlation_id}:{chunk_index}"
        claimed = False

        if self._idempotency is not None:
            claimed = await self._idempotency.claim(
                company_id=company_id,
                consumer=consumer,
                key=dedupe_key,
                ttl_seconds=7 * 24 * 3600,
                event_type="message.sent",
                correlation_id=correlation_id,
                causation_id=causation_id,
                metadata={"instance_id": instance_id, "to": to_number, "chunk_index": chunk_index, "type": msg_type},
            )
            if not claimed:
                return False

        event = build_envelope(
            type="message.sent",
            company_id=company_id,
            source="agent-runtime",
            correlation_id=correlation_id,
            causation_id=causation_id,
            payload={
                "instance_id": instance_id,
                "to": to_number,
                "messages": [message],
                "raw": meta,
            },
        )

        DOMAIN_EVENTS_TOTAL.labels(type="message.sent").inc()
        MESSAGES_TOTAL.labels(direction="outbound", channel_type=channel_type, content_type=str(msg_type)).inc()
        try:
            await self._redis.publish("message.sent", json.dumps(event, ensure_ascii=False))
            return True
        except Exception:
            if claimed and self._idempotency is not None:
                try:
                    await self._idempotency.release(
                        company_id=company_id,
                        consumer=consumer,
                        key=dedupe_key,
                    )
                except Exception:
                    pass
            raise

    async def send_text(
        self,
        *,
        company_id: str,
        instance_id: str,
        to_number: str,
        text: str,
        channel_type: str = "whatsapp",
        correlation_id: str,
        causation_id: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        meta = metadata or {}
        chunk_index = meta.get("chunk_index")
        if not isinstance(chunk_index, int):
            chunk_index = 0

        consumer = "agent-runtime:message.sent"
        dedupe_key = f"{correlation_id}:{chunk_index}"
        claimed = False

        if self._idempotency is not None:
            claimed = await self._idempotency.claim(
                company_id=company_id,
                consumer=consumer,
                key=dedupe_key,
                ttl_seconds=7 * 24 * 3600,
                event_type="message.sent",
                correlation_id=correlation_id,
                causation_id=causation_id,
                metadata={"instance_id": instance_id, "to": to_number, "chunk_index": chunk_index},
            )
            if not claimed:
                return False

        event = build_envelope(
            type="message.sent",
            company_id=company_id,
            source="agent-runtime",
            correlation_id=correlation_id,
            causation_id=causation_id,
            payload={
                "instance_id": instance_id,
                "to": to_number,
                "messages": [{"type": "text", "text": text}],
                "raw": meta,
            },
        )

        DOMAIN_EVENTS_TOTAL.labels(type="message.sent").inc()
        MESSAGES_TOTAL.labels(direction="outbound", channel_type=channel_type, content_type="text").inc()
        try:
            await self._redis.publish("message.sent", json.dumps(event, ensure_ascii=False))
            return True
        except Exception:
            if claimed and self._idempotency is not None:
                try:
                    await self._idempotency.release(
                        company_id=company_id,
                        consumer=consumer,
                        key=dedupe_key,
                    )
                except Exception:
                    pass
            raise
