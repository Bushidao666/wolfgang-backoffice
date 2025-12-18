import pytest

from modules.memory.services.fact_extractor import FactExtractor


@pytest.mark.asyncio
async def test_extract_fallback_returns_empty_for_blank():
    extractor = FactExtractor()
    assert await extractor.extract(company_id="c1", conversation_text="") == []
    assert await extractor.extract(company_id="c1", conversation_text="   \n") == []


@pytest.mark.asyncio
async def test_extract_fallback_parses_common_fields_and_dedupes():
    extractor = FactExtractor()
    text = (
        "Meu email é Test@Example.com. "
        "Meu email é test@example.com. "
        "Telefone +55 11 99999-9999. "
        "Orçamento R$ 1.000,00. "
        "Data 12/12/2025."
    )

    facts = await extractor.extract(company_id="c1", conversation_text=text)
    texts = [f.text for f in facts]

    assert any(t.startswith("Email informado:") for t in texts)
    assert any(t.startswith("Telefone mencionado:") for t in texts)
    assert any(t.startswith("Orçamento mencionado:") for t in texts)
    assert any(t.startswith("Data mencionada:") for t in texts)

    emails = [t for t in texts if t.lower().startswith("email informado:")]
    assert len(emails) == 1


@pytest.mark.asyncio
async def test_extract_uses_openai_when_api_key_is_set(monkeypatch):
    import types

    settings = types.SimpleNamespace(
        openai_api_key="k",
        openai_base_url="https://example.test",
        openai_chat_model="gpt",
    )
    monkeypatch.setattr("modules.memory.services.fact_extractor.get_settings", lambda: settings)

    class _Choice:
        message = types.SimpleNamespace(content='[{"text":"Gosta de pizza","category":"preference"}]')

    class _Res:
        choices = [_Choice()]

    class _Completions:
        async def create(self, **kwargs):  # noqa: ARG002
            return _Res()

    class _Chat:
        completions = _Completions()

    class _FakeOpenAI:
        def __init__(self, *, api_key: str, base_url: str):  # noqa: ARG002
            self.chat = _Chat()

    monkeypatch.setattr("modules.memory.services.fact_extractor.AsyncOpenAI", _FakeOpenAI)

    extractor = FactExtractor()
    facts = await extractor.extract(company_id="c1", conversation_text="conversa")

    assert len(facts) == 1
    assert facts[0].category == "preference"
    assert "pizza" in facts[0].text.lower()


@pytest.mark.asyncio
async def test_extract_falls_back_when_openai_returns_invalid_json(monkeypatch):
    import types

    settings = types.SimpleNamespace(
        openai_api_key="k",
        openai_base_url="https://example.test",
        openai_chat_model="gpt",
    )
    monkeypatch.setattr("modules.memory.services.fact_extractor.get_settings", lambda: settings)

    class _Choice:
        message = types.SimpleNamespace(content="not json")

    class _Res:
        choices = [_Choice()]

    class _Completions:
        async def create(self, **kwargs):  # noqa: ARG002
            return _Res()

    class _Chat:
        completions = _Completions()

    class _FakeOpenAI:
        def __init__(self, *, api_key: str, base_url: str):  # noqa: ARG002
            self.chat = _Chat()

    monkeypatch.setattr("modules.memory.services.fact_extractor.AsyncOpenAI", _FakeOpenAI)

    extractor = FactExtractor()
    facts = await extractor.extract(company_id="c1", conversation_text="email test@example.com")
    assert any("Email informado" in f.text for f in facts)
