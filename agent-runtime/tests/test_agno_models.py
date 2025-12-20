from modules.centurion.agno_models.media_decision_models import MediaPlan as MediaPlanAlias
from modules.centurion.agno_models.media_plan_models import MediaChannelPlan, MediaPlan
from modules.centurion.agno_models.qualification_models import QualificationExtraction, QualificationFieldExtraction


def test_media_models_import_and_validate():
    plan = MediaPlan(
        objective="Gerar leads qualificados",
        total_budget="R$ 1.500,00",
        timeframe="30 dias",
        channels=[MediaChannelPlan(channel="meta_ads", budget_share=1.0, rationale="Alcance local")],
        kpis=["leads", "cpl"],
        notes="Plano inicial.",
    )

    assert plan.objective
    assert MediaPlanAlias is MediaPlan


def test_qualification_models_normalize_and_dump():
    extraction = QualificationExtraction(
        fields=[
            QualificationFieldExtraction(
                field=" budget ",
                value="  R$ 1.500,00  ",
                confidence=0.9,
                evidence="  Trecho do chat  ",
            )
        ],
        summary="  Resumo  ",
    )

    assert extraction.fields[0].field == "budget"
    assert extraction.fields[0].value == "R$ 1.500,00"
    assert extraction.fields[0].evidence == "Trecho do chat"
    assert extraction.summary == "Resumo"

    dumped = extraction.as_db_dict()
    assert dumped["summary"] == "Resumo"

    # Blank/whitespace becomes None/empty.
    extraction2 = QualificationExtraction(
        fields=[QualificationFieldExtraction(field="budget", value=" ", evidence=" ")],
        summary=" ",
    )
    assert extraction2.fields[0].value is None
    assert extraction2.fields[0].evidence is None
    assert extraction2.summary is None


def test_media_plan_dump_is_db_compatible():
    plan = MediaPlan(
        objective="  Gerar leads  ",
        total_budget="  R$ 10  ",
        timeframe=" ",
        channels=[MediaChannelPlan(channel="meta_ads", budget_share=1.0, rationale=None)],
        kpis=["leads"],
    )
    dumped = plan.as_db_dict()
    assert dumped["objective"] == "Gerar leads"
    assert dumped["total_budget"] == "R$ 10"
    assert dumped.get("timeframe") is None
