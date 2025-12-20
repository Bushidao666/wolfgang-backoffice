import pytest

from common.infrastructure.integrations.openai_resolver import OpenAIResolved
from modules.centurion.agno_models.qualification_models import QualificationExtraction, QualificationFieldExtraction
from modules.centurion.services.qualification_service import QualificationService


def test_evaluate_extracts_required_fields_and_qualifies_when_threshold_met():
    service = QualificationService()
    rules = {"required_fields": ["budget", "date", "location"], "threshold": 1.0}
    text = "Orçamento R$ 1.500,00. Data 12/12/2025. Rua das Flores 123."

    result = service.evaluate(qualification_rules=rules, conversation_text=text, previous_data={})

    assert result.score == 1.0
    assert result.qualified_at is not None
    assert result.criteria_met == {"budget": True, "date": True, "location": True}
    assert result.extracted["budget"].startswith("R$")
    assert result.extracted["date"] == "12/12/2025"
    assert "Rua" in result.extracted["location"]
    assert "budget=" in result.summary


def test_evaluate_respects_previous_data_and_does_not_require_reextract():
    service = QualificationService()
    rules = {"required_fields": ["budget", "date"], "threshold": 1.0}

    result = service.evaluate(
        qualification_rules=rules,
        conversation_text="Data 01/01/2026",
        previous_data={"budget": "R$ 1000"},
    )

    assert result.criteria_met["budget"] is True
    assert result.criteria_met["date"] is True
    assert result.score == 1.0


def test_evaluate_returns_unqualified_when_missing_fields():
    service = QualificationService()
    rules = {"required_fields": ["budget", "location"], "threshold": 1.0}

    result = service.evaluate(qualification_rules=rules, conversation_text="Tenho interesse.", previous_data={})

    assert result.score == 0.0
    assert result.qualified_at is None
    assert result.criteria_met["budget"] is False
    assert result.criteria_met["location"] is False


@pytest.mark.asyncio
async def test_aevaluate_falls_back_when_llm_is_missing():
    service = QualificationService()
    rules = {"required_fields": ["budget", "date", "location"], "threshold": 1.0}
    text = "Orçamento R$ 1.500,00. Data 12/12/2025. Rua das Flores 123."

    llm_result = await service.aevaluate(
        qualification_rules=rules,
        conversation_text=text,
        previous_data={},
        llm=None,
    )
    det_result = service.evaluate(qualification_rules=rules, conversation_text=text, previous_data={})

    assert llm_result.score == det_result.score
    assert llm_result.criteria_met == det_result.criteria_met
    assert llm_result.extracted == det_result.extracted
    assert bool(llm_result.qualified_at) == bool(det_result.qualified_at)


@pytest.mark.asyncio
async def test_aevaluate_merges_structured_output_from_llm(monkeypatch):
    service = QualificationService()
    rules = {"required_fields": ["budget"], "threshold": 1.0}
    text = "Orçamento R$ 1.500,00."

    llm = OpenAIResolved(
        api_key="test",
        base_url="http://example.test",
        chat_model="gpt-4o-mini",
        vision_model="gpt-4o-mini",
        stt_model="whisper-1",
        embedding_model="text-embedding-3-small",
    )

    class _FakeAgent:
        def __init__(self, *args, **kwargs):  # noqa: ANN002, D401
            pass

        async def arun(self, *args, **kwargs):  # noqa: ANN002
            return type(
                "Out",
                (),
                {
                    "content": QualificationExtraction(
                        fields=[QualificationFieldExtraction(field="budget", value="R$ 1.500,00", confidence=0.9)],
                        summary="budget=R$ 1.500,00",
                    )
                },
            )()

    import agno.agent as agno_agent

    monkeypatch.setattr(agno_agent, "Agent", _FakeAgent)

    result = await service.aevaluate(
        qualification_rules=rules,
        conversation_text=text,
        previous_data={},
        llm=llm,
    )

    assert result.criteria_met["budget"] is True
    assert result.score == 1.0


@pytest.mark.asyncio
async def test_aevaluate_supports_llm_criteria(monkeypatch):
    service = QualificationService()
    rules = {
        "criteria": [{"key": "intent", "type": "llm", "prompt": "Detect buying intent", "weight": 1.0, "required": True}],
        "threshold": 1.0,
    }

    llm = OpenAIResolved(
        api_key="test",
        base_url="http://example.test",
        chat_model="gpt-4o-mini",
        vision_model="gpt-4o-mini",
        stt_model="whisper-1",
        embedding_model="text-embedding-3-small",
    )

    class _FakeAgent:
        def __init__(self, *args, **kwargs):  # noqa: ANN002
            self._output_schema = kwargs.get("output_schema")

        async def arun(self, *args, **kwargs):  # noqa: ANN002
            from modules.centurion.agno_models.criteria_eval_models import CriteriaEvalItem, CriteriaEvalOutput

            if self._output_schema is CriteriaEvalOutput:
                return type(
                    "Out",
                    (),
                    {
                        "content": CriteriaEvalOutput(
                            criteria=[CriteriaEvalItem(key="intent", met=True, evidence="quero fechar hoje", confidence=0.9)],
                            summary="intent met",
                        )
                    },
                )()

            return type("Out", (), {"content": None})()

    import agno.agent as agno_agent

    monkeypatch.setattr(agno_agent, "Agent", _FakeAgent)

    result = await service.aevaluate(
        qualification_rules=rules,
        conversation_text="Quero fechar hoje.",
        previous_data={},
        llm=llm,
    )

    assert result.criteria_met["intent"] is True
    assert result.score == 1.0
    assert result.qualified_at is not None
