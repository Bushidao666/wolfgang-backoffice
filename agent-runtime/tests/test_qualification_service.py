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

