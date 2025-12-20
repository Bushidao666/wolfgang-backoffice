import json

import pytest

from modules.centurion.services.whatsapp_sender import WhatsAppSender


class _Redis:
    def __init__(self):
        self.published: list[tuple[str, str]] = []

    async def publish(self, channel: str, message: str):
        self.published.append((channel, message))


@pytest.mark.asyncio
async def test_send_text_publishes_message_sent_event():
    redis = _Redis()
    sender = WhatsAppSender(redis)  # type: ignore[arg-type]

    await sender.send_text(
        company_id="co1",
        instance_id="inst1",
        to_number="+55119999",
        text="oi",
        correlation_id="corr1",
        causation_id=None,
        metadata={"k": "v"},
    )

    assert len(redis.published) == 1
    channel, payload = redis.published[0]
    assert channel == "message.sent"

    data = json.loads(payload)
    assert data["type"] == "message.sent"
    assert data["company_id"] == "co1"
    assert data["correlation_id"] == "corr1"
    assert data["payload"]["to"] == "+55119999"
    assert data["payload"]["messages"][0]["text"] == "oi"


@pytest.mark.asyncio
async def test_send_message_publishes_media_message_sent_event():
    redis = _Redis()
    sender = WhatsAppSender(redis)  # type: ignore[arg-type]

    await sender.send_message(
        company_id="co1",
        instance_id="inst1",
        to_number="+55119999",
        message={"type": "image", "asset_id": "asset-1", "caption": "Veja"},
        correlation_id="corr1",
        causation_id=None,
        metadata={"chunk_index": 2},
    )

    assert len(redis.published) == 1
    channel, payload = redis.published[0]
    assert channel == "message.sent"

    data = json.loads(payload)
    assert data["payload"]["messages"][0]["type"] == "image"
    assert data["payload"]["messages"][0]["asset_id"] == "asset-1"
