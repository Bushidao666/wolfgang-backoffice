from modules.channels.adapters.base_adapter import BaseChannelAdapter, PrefixedChannelAdapter
from modules.channels.adapters.instagram_adapter import InstagramAdapter
from modules.channels.adapters.telegram_adapter import TelegramAdapter
from modules.channels.contracts.events import MessageReceivedPayload
from modules.channels.services.channel_router import ChannelRouter


def test_base_adapter_normalizes_inbound_minimally():
    adapter = BaseChannelAdapter()
    payload = MessageReceivedPayload.model_validate({"instance_id": "inst1", "from": "+55119999", "body": "oi"})
    msg = adapter.normalize_inbound(payload)
    assert msg.from_id == "+55119999"
    assert msg.lead_external_id == "+55119999"
    assert msg.body == "oi"
    assert msg.media is None
    assert msg.raw == {}


def test_prefixed_adapter_adds_prefix():
    class P(PrefixedChannelAdapter):
        prefix = "x:"

    adapter = P()
    payload = MessageReceivedPayload.model_validate({"instance_id": "inst1", "from": "123", "body": "oi"})
    msg = adapter.normalize_inbound(payload)
    assert msg.from_id == "x:123"
    assert msg.lead_external_id == "x:123"


def test_instagram_adapter_sets_story_or_mention_fallback_body():
    adapter = InstagramAdapter()
    payload = MessageReceivedPayload.model_validate({"instance_id": "inst1", "from": "123", "raw": {"is_story": True}})
    msg = adapter.normalize_inbound(payload)
    assert msg.from_id.startswith("instagram:")
    assert msg.body == "[instagram] story mention"


def test_telegram_adapter_extracts_command():
    adapter = TelegramAdapter()
    payload = MessageReceivedPayload.model_validate({"instance_id": "inst1", "from": "123", "body": "/start agora", "raw": {}})
    msg = adapter.normalize_inbound(payload)
    assert msg.from_id.startswith("telegram:")
    assert msg.raw["telegram"]["command"] == "/start"


def test_telegram_adapter_extracts_message_id_and_fills_body_from_raw_update():
    adapter = TelegramAdapter()
    payload = MessageReceivedPayload.model_validate(
        {
            "instance_id": "inst1",
            "from": "123",
            "body": None,
            "raw": {"provider": "telegram", "update": {"update_id": 10, "message": {"message_id": 99, "text": "oi"}}},
        }
    )
    msg = adapter.normalize_inbound(payload)
    assert msg.raw["message_id"] == "99"
    assert msg.body == "oi"


def test_instagram_adapter_extracts_message_id_from_nested_raw_data():
    adapter = InstagramAdapter()
    payload = MessageReceivedPayload.model_validate(
        {
            "instance_id": "inst1",
            "from": "123",
            "body": "oi",
            "raw": {"data": {"key": {"id": "m123"}}},
        }
    )
    msg = adapter.normalize_inbound(payload)
    assert msg.raw["message_id"] == "m123"


def test_channel_router_defaults_to_whatsapp_adapter():
    router = ChannelRouter()
    msg = router.normalize_inbound(channel_type="unknown", payload={"instance_id": "inst1", "from": "123", "body": "oi"})
    assert msg.from_id == "123"
    assert msg.body == "oi"
