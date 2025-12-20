import json

from modules.centurion.domain.message import Message
from modules.centurion.services.prompt_builder import PromptBuilder


def test_build_qualification_extraction_messages_emits_json_payload():
    pb = PromptBuilder()
    messages = pb.build_qualification_extraction_messages(
        qualification_rules={"required_fields": ["budget"], "threshold": 1.0},
        conversation_text="Orçamento R$ 1.000,00.",
        previous_data={"budget": "R$ 900,00"},
    )

    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"

    payload = json.loads(messages[1]["content"])
    assert payload["qualification_rules"]["required_fields"] == ["budget"]
    assert payload["previous_data"]["budget"] == "R$ 900,00"
    assert "Orçamento" in payload["conversation_text"]


def test_build_includes_history_and_trims_pending_messages():
    pb = PromptBuilder()

    history = [
        Message(
            id="m1",
            conversation_id="c1",
            company_id="co1",
            lead_id="l1",
            direction="inbound",
            content_type="text",
            content="Olá",
        ),
        Message(
            id="m2",
            conversation_id="c1",
            company_id="co1",
            lead_id="l1",
            direction="outbound",
            content_type="text",
            content="Oi! Como posso ajudar?",
        ),
        Message(
            id="m3",
            conversation_id="c1",
            company_id="co1",
            lead_id="l1",
            direction="inbound",
            content_type="text",
            content="Quero um orçamento",
        ),
    ]

    prompt = pb.build(
        centurion_config={"prompt": "Você é um SDR."},
        history=history,
        consolidated_user_message="Mensagem consolidada",
        pending_count=2,
        rag_items=[{"summary": "Lead gosta de respostas curtas."}],
        knowledge_items=[{"document_title": "FAQ", "content": "Horário de atendimento: 9-18h."}],
    )

    assert prompt.messages[0]["role"] == "system"
    assert "<memoria_long_term>" in prompt.system
    assert "<knowledge_base>" in prompt.system
    assert prompt.messages[-1] == {"role": "user", "content": "Mensagem consolidada"}

    # With pending_count=2, the last inbound message is treated as pending and removed from history.
    contents = [m["content"] for m in prompt.messages if m["role"] != "system"]
    assert "Quero um orçamento" not in contents
