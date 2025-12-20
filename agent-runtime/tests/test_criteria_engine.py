from modules.centurion.qualification.criteria_engine import CriteriaEngine, compute_rules_hash


def test_parse_rules_prefers_criteria_over_required_fields():
    engine = CriteriaEngine()
    rules = {
        "threshold": 0.7,
        "required_fields": ["budget"],
        "criteria": [
            {"key": "budget", "type": "field_present", "field": "budget", "weight": 0.2, "required": True},
            {"key": "intent", "type": "llm", "prompt": "Check intent", "weight": 0.8, "required": False},
        ],
    }

    parsed = engine.parse_rules(rules)
    assert parsed.threshold == 0.7
    assert [c.key for c in parsed.criteria] == ["budget", "intent"]


def test_evaluate_weighted_score_and_required_gate():
    engine = CriteriaEngine()
    rules = {
        "threshold": 0.7,
        "criteria": [
            {"key": "budget", "type": "field_present", "field": "budget", "weight": 0.2, "required": True},
            {"key": "intent", "type": "llm", "prompt": "Check intent", "weight": 0.8, "required": False},
        ],
    }
    parsed = engine.parse_rules(rules)

    res = engine.evaluate(
        parsed=parsed,
        conversation_text="Orçamento R$ 1.500,00.",
        previous_data={},
        llm_results={"intent": {"met": False, "evidence": "No explicit intent"}},
    )

    assert res.criteria_met["budget"] is True
    assert res.criteria_met["intent"] is False
    assert res.required_met is True
    assert res.score == 0.2
    assert res.is_qualified is False
    assert res.qualified_at is None


def test_evaluate_qualifies_when_all_required_met_and_score_over_threshold():
    engine = CriteriaEngine()
    rules = {
        "threshold": 0.7,
        "criteria": [
            {"key": "budget", "type": "field_present", "field": "budget", "weight": 0.2, "required": True},
            {"key": "intent", "type": "llm", "prompt": "Check intent", "weight": 0.8, "required": False},
        ],
    }
    parsed = engine.parse_rules(rules)

    res = engine.evaluate(
        parsed=parsed,
        conversation_text="Orçamento R$ 1.500,00. Quero fechar hoje.",
        previous_data={},
        llm_results={"intent": {"met": True, "evidence": "Quero fechar hoje"}},
    )

    assert res.score == 1.0
    assert res.required_met is True
    assert res.is_qualified is True
    assert res.qualified_at is not None


def test_required_fields_fallback_uses_equal_weights():
    engine = CriteriaEngine()
    parsed = engine.parse_rules({"required_fields": ["budget", "date"], "threshold": 1.0})

    assert [c.key for c in parsed.criteria] == ["budget", "date"]
    assert all(abs(c.weight - 0.5) < 1e-9 for c in parsed.criteria)

    res = engine.evaluate(
        parsed=parsed,
        conversation_text="Orçamento R$ 1.000,00. Data 01/01/2026.",
        previous_data={},
    )

    assert res.score == 1.0
    assert res.is_qualified is True


def test_compute_rules_hash_is_stable_for_equivalent_objects():
    a = {"threshold": 1.0, "criteria": [{"key": "x", "type": "llm", "prompt": "p", "weight": 1.0, "required": True}]}
    b = {"criteria": [{"prompt": "p", "type": "llm", "weight": 1.0, "required": True, "key": "x"}], "threshold": 1.0}
    assert compute_rules_hash(a) == compute_rules_hash(b)

