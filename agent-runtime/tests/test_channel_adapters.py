from modules.channels.adapters.base_adapter import BaseChannelAdapter, PrefixedChannelAdapter
from modules.channels.adapters.instagram_adapter import InstagramAdapter
from modules.channels.adapters.telegram_adapter import TelegramAdapter
from modules.channels.services.channel_router import ChannelRouter


def test_base_adapter_normalizes_inbound_minimally():
    adapter = BaseChannelAdapter()
    msg = adapter.normalize_inbound({"from": "+55119999", "body": "oi"})
    assert msg.from_id == "+55119999"
    assert msg.lead_external_id == "+55119999"
    assert msg.body == "oi"
    assert msg.media is None
    assert msg.raw == {}


def test_prefixed_adapter_adds_prefix():
    class P(PrefixedChannelAdapter):
        prefix = "x:"

    adapter = P()
    msg = adapter.normalize_inbound({"from": "123", "body": "oi"})
    assert msg.from_id == "x:123"
    assert msg.lead_external_id == "x:123"


def test_instagram_adapter_sets_story_or_mention_fallback_body():
    adapter = InstagramAdapter()
    msg = adapter.normalize_inbound({"from": "123", "raw": {"is_story": True}})
    assert msg.from_id.startswith("instagram:")
    assert msg.body == "[instagram] story mention"


def test_telegram_adapter_extracts_command():
    adapter = TelegramAdapter()
    msg = adapter.normalize_inbound({"from": "123", "body": "/start agora", "raw": {}})
    assert msg.from_id.startswith("telegram:")
    assert msg.raw["telegram"]["command"] == "/start"


def test_channel_router_defaults_to_whatsapp_adapter():
    router = ChannelRouter()
    msg = router.normalize_inbound(channel_type="unknown", payload={"from": "123", "body": "oi"})
    assert msg.from_id == "123"
    assert msg.body == "oi"

