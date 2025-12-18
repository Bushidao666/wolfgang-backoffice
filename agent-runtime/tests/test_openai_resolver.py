import types

import pytest

from common.infrastructure.integrations.openai_resolver import OpenAIResolver


class _FakeDb:
    async def fetchrow(self, query: str, *args):  # noqa: ARG002
        raise AssertionError("DB should not be accessed in these tests")


@pytest.mark.asyncio
async def test_openai_resolver_prefers_company_integration(monkeypatch):
    resolver = OpenAIResolver(_FakeDb())  # type: ignore[arg-type]

    async def fake_resolve(*, company_id: str, provider: str):  # noqa: ARG001
        assert provider == "openai"
        return types.SimpleNamespace(
            config={
                "base_url": "   ",
                "api_base_url": " https://db.openai.local/v1 ",
                "chat_model": " gpt-db ",
            },
            secrets={"api_key": " key "},
        )

    monkeypatch.setattr(resolver._integrations, "resolve", fake_resolve)

    resolved = await resolver.resolve_optional(company_id="c1")
    assert resolved is not None
    assert resolved.api_key == "key"
    assert resolved.base_url == "https://db.openai.local/v1"
    assert resolved.chat_model == "gpt-db"
    assert resolved.vision_model == "gpt-4o-mini"
    assert resolved.stt_model == "whisper-1"
    assert resolved.embedding_model == "text-embedding-3-small"


@pytest.mark.asyncio
async def test_openai_resolver_returns_none_when_db_missing(monkeypatch):
    resolver = OpenAIResolver(_FakeDb())  # type: ignore[arg-type]

    async def fake_resolve(*, company_id: str, provider: str):  # noqa: ARG001
        raise RuntimeError("db unreachable")

    monkeypatch.setattr(resolver._integrations, "resolve", fake_resolve)

    resolved = await resolver.resolve_optional(company_id="c1")
    assert resolved is None


@pytest.mark.asyncio
async def test_openai_resolver_resolve_raises_when_unconfigured(monkeypatch):
    resolver = OpenAIResolver(_FakeDb())  # type: ignore[arg-type]

    async def fake_resolve(*, company_id: str, provider: str):  # noqa: ARG001
        return None

    monkeypatch.setattr(resolver._integrations, "resolve", fake_resolve)

    with pytest.raises(RuntimeError, match="OpenAI integration is not configured"):
        await resolver.resolve(company_id="c1")
