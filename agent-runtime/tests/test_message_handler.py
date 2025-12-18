import json
import types

import pytest

from modules.centurion.domain.conversation import Conversation
from modules.centurion.domain.lead import Lead
from modules.centurion.handlers.message_handler import MessageHandler


class _Db:
    async def fetchrow(self, query: str, *args):  # noqa: ARG002
        return {"channel_type": "whatsapp"}


class _Redis:
    def __init__(self):
        self.published: list[tuple[str, str]] = []

    async def publish(self, channel: str, message: str):
        self.published.append((channel, message))


class _LeadRepo:
    def __init__(self, *, lead: Lead, created: bool):
        self.lead = lead
        self.created = created
        self.calls: list[tuple[str, str]] = []
        self.touched: list[tuple[str, str]] = []

    async def get_or_create(self, *, company_id: str, phone: str):
        self.calls.append((company_id, phone))
        return self.lead, self.created

    async def touch_inbound(self, *, company_id: str, lead_id: str):
        self.touched.append((company_id, lead_id))


class _Followups:
    def __init__(self):
        self.canceled: list[tuple[str, str]] = []

    async def cancel_pending(self, *, company_id: str, lead_id: str):
        self.canceled.append((company_id, lead_id))
        return 1


class _ConfigRepo:
    def __init__(self, config: dict):
        self.config = config

    async def get_centurion_config(self, *, company_id: str, centurion_id: str | None):  # noqa: ARG002
        return dict(self.config)


class _ConvRepo:
    def __init__(self, conversation: Conversation):
        self.conversation = conversation
        self.updated: list[dict] = []
        self.created_calls: list[dict] = []

    async def get_or_create(self, **kwargs):
        self.created_calls.append(kwargs)
        return self.conversation

    async def update_debounce(self, **kwargs):
        self.updated.append(kwargs)


class _MsgRepo:
    def __init__(self):
        self.saved: list[dict] = []
        self.enriched: list[dict] = []

    async def save_message(self, **kwargs):
        self.saved.append(kwargs)
        return "msg1"

    async def set_media_enrichment(self, **kwargs):
        self.enriched.append(kwargs)


class _ShortTerm:
    def __init__(self):
        self.invalidated: list[str] = []

    async def invalidate_cache(self, conversation_id: str):
        self.invalidated.append(conversation_id)


@pytest.mark.asyncio
async def test_handle_message_received_happy_path(monkeypatch):
    db = _Db()
    redis = _Redis()
    handler = MessageHandler(db=db, redis=redis)  # type: ignore[arg-type]

    lead = Lead(id="l1", company_id="co1", phone="+55119999", centurion_id="ct1")
    handler._lead_repo = _LeadRepo(lead=lead, created=True)  # type: ignore[attr-defined]
    handler._followups = _Followups()  # type: ignore[attr-defined]
    handler._config_repo = _ConfigRepo({"id": "ct1", "debounce_wait_ms": 10})  # type: ignore[attr-defined]
    handler._conv_repo = _ConvRepo(
        Conversation(
            id="conv1",
            company_id="co1",
            lead_id="l1",
            centurion_id="ct1",
            channel_type="whatsapp",
            channel_instance_id="inst1",
        )
    )  # type: ignore[attr-defined]
    handler._msg_repo = _MsgRepo()  # type: ignore[attr-defined]
    handler._short_term = _ShortTerm()  # type: ignore[attr-defined]

    published = {"lead_created": False, "debounce_timer": False}

    async def fake_publish_lead_created(*args, **kwargs):  # noqa: ARG001
        published["lead_created"] = True

    async def fake_publish_debounce_timer(*args, **kwargs):  # noqa: ARG001
        published["debounce_timer"] = True

    monkeypatch.setattr(handler, "_publish_lead_created", fake_publish_lead_created)
    monkeypatch.setattr(handler, "_publish_debounce_timer", fake_publish_debounce_timer)

    event = {
        "id": "evt1",
        "type": "message.received",
        "company_id": "co1",
        "payload": {"instance_id": "inst1", "from": "+55119999", "body": "oi", "raw": {"message_id": "m"}},
        "correlation_id": "corr1",
    }

    await handler.handle_message_received(json.dumps(event))

    assert handler._lead_repo.calls == [("co1", "+55119999")]  # type: ignore[attr-defined]
    assert handler._followups.canceled == [("co1", "l1")]  # type: ignore[attr-defined]
    assert handler._msg_repo.saved[0]["content"] == "oi"  # type: ignore[attr-defined]
    assert handler._short_term.invalidated == ["conv1"]  # type: ignore[attr-defined]
    assert published == {"lead_created": True, "debounce_timer": True}
    assert handler._conv_repo.updated  # type: ignore[attr-defined]
    assert handler._conv_repo.updated[0]["pending_messages"] == ["oi"]  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_handle_message_received_ignores_invalid_payload():
    handler = MessageHandler(db=_Db(), redis=_Redis())  # type: ignore[arg-type]

    # invalid json
    await handler.handle_message_received("{bad")

    # wrong type
    await handler.handle_message_received(json.dumps({"type": "nope"}))


@pytest.mark.asyncio
async def test_handle_message_received_processes_audio_media(monkeypatch):
    db = _Db()
    redis = _Redis()
    handler = MessageHandler(db=db, redis=redis)  # type: ignore[arg-type]

    lead = Lead(id="l1", company_id="co1", phone="+55119999", centurion_id="ct1")
    handler._lead_repo = _LeadRepo(lead=lead, created=False)  # type: ignore[attr-defined]
    handler._followups = _Followups()  # type: ignore[attr-defined]
    handler._config_repo = _ConfigRepo({"id": "ct1", "debounce_wait_ms": 10, "can_process_audio": True})  # type: ignore[attr-defined]
    handler._conv_repo = _ConvRepo(
        Conversation(
            id="conv1",
            company_id="co1",
            lead_id="l1",
            centurion_id="ct1",
            channel_type="whatsapp",
            channel_instance_id="inst1",
        )
    )  # type: ignore[attr-defined]
    handler._msg_repo = _MsgRepo()  # type: ignore[attr-defined]
    handler._short_term = _ShortTerm()  # type: ignore[attr-defined]

    async def noop(*args, **kwargs):  # noqa: ARG001
        return None

    monkeypatch.setattr(handler, "_publish_debounce_timer", noop)

    async def download(url: str):
        assert url == "http://example.test/a"
        return b"audio", "audio/ogg"

    async def transcribe(*, company_id: str, audio_bytes: bytes, filename: str = "audio.ogg"):  # noqa: ARG001
        assert company_id == "co1"
        assert audio_bytes == b"audio"
        return "transcribed"

    handler._downloader = types.SimpleNamespace(download=download)  # type: ignore[attr-defined]
    handler._stt = types.SimpleNamespace(transcribe=transcribe)  # type: ignore[attr-defined]

    event = {
        "id": "evt1",
        "type": "message.received",
        "company_id": "co1",
        "payload": {
            "instance_id": "inst1",
            "from": "+55119999",
            "body": "",
            "media": {"type": "audio", "url": "http://example.test/a", "mime_type": "audio/ogg"},
            "raw": {},
        },
    }

    await handler.handle_message_received(json.dumps(event))
    assert handler._msg_repo.enriched  # type: ignore[attr-defined]
    assert handler._conv_repo.updated[0]["pending_messages"] == ["transcribed"]  # type: ignore[attr-defined]
