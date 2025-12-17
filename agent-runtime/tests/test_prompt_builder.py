from modules.centurion.domain.message import Message
from modules.centurion.services.prompt_builder import PromptBuilder


def _msg(id: str, direction: str, *, content: str | None = None, audio: str | None = None) -> Message:
    return Message(
        id=id,
        conversation_id="conv1",
        company_id="co1",
        lead_id="l1",
        direction=direction,
        content_type="text" if content is not None else "audio",
        content=content,
        audio_transcription=audio,
    )


def test_build_includes_rag_kb_history_and_consolidated_message():
    builder = PromptBuilder()

    history = [
        _msg("m1", "inbound", content="Olá"),
        _msg("m2", "outbound", content="Oi!"),
        _msg("m3", "inbound", audio="bom dia"),
    ]

    prompt = builder.build(
        centurion_config={"prompt": "BASE"},
        history=history,
        consolidated_user_message="Quero um orçamento",
        pending_count=1,
        rag_items=[{"summary": "Fato 1"}, {"summary": " "}, {"summary": "Fato 2"}],
        knowledge_items=[{"document_title": "Doc A", "content": "Conteúdo A"}, {"document_title": "Doc B", "content": ""}],
    )

    assert "<memoria_long_term>" in prompt.system
    assert "Fato 1" in prompt.system
    assert "<knowledge_base>" in prompt.system
    assert "[Doc A] Conteúdo A" in prompt.system

    assert prompt.messages[0]["role"] == "system"
    assert prompt.messages[1] == {"role": "user", "content": "Olá"}
    assert prompt.messages[2] == {"role": "assistant", "content": "Oi!"}
    assert prompt.messages[3]["role"] == "user"
    assert prompt.messages[3]["content"] == "[ÁUDIO] bom dia"
    assert prompt.messages[-1] == {"role": "user", "content": "Quero um orçamento"}


def test_trim_pending_removes_last_inbound_turns():
    builder = PromptBuilder()

    history = [
        _msg("m1", "inbound", content="u1"),
        _msg("m2", "outbound", content="a1"),
        _msg("m3", "inbound", content="u2"),
        _msg("m4", "outbound", content="a2"),
        _msg("m5", "inbound", content="u3"),
        _msg("m6", "outbound", content="a3"),
    ]

    prompt = builder.build(
        centurion_config={"prompt": "BASE"},
        history=history,
        consolidated_user_message="nova",
        pending_count=2,
        rag_items=None,
        knowledge_items=None,
    )

    # pending_count=2 trims the last two inbound messages (and any messages after them)
    roles = [m["role"] for m in prompt.messages]
    assert roles == ["system", "user", "assistant", "user"]
    assert prompt.messages[1]["content"] == "u1"
    assert prompt.messages[2]["content"] == "a1"
    assert prompt.messages[3]["content"] == "nova"

