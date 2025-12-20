from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from common.infrastructure.integrations.openai_resolver import OpenAIResolved
from modules.centurion.agno_models.criteria_eval_models import CriteriaEvalOutput
from modules.centurion.agno_models.qualification_models import QualificationExtraction
from modules.centurion.qualification.criteria_engine import CriteriaEngine
from modules.centurion.services.prompt_builder import PromptBuilder


@dataclass(frozen=True)
class QualificationResult:
    score: float
    threshold: float
    required_met: bool
    criteria_met: dict[str, bool]
    criteria_details: list[dict[str, Any]]
    extracted: dict[str, Any]
    qualified_at: datetime | None
    summary: str


class QualificationService:
    def __init__(self, *, prompt_builder: PromptBuilder | None = None):
        self._prompts = prompt_builder or PromptBuilder()
        self._engine = CriteriaEngine()

    async def aevaluate(
        self,
        *,
        qualification_rules: dict[str, Any],
        conversation_text: str,
        previous_data: dict[str, Any],
        llm: OpenAIResolved | None,
    ) -> QualificationResult:
        """
        LLM-assisted evaluation (field extraction + custom criteria), using structured output.

        The runtime computes score/qualification deterministically (weights + threshold),
        and uses the LLM only to (1) extract missing field_present values and (2) evaluate
        custom llm criteria. If LLM is unavailable or parsing fails, this falls back
        to the deterministic evaluator (`evaluate`).
        """
        parsed = self._engine.parse_rules(qualification_rules)
        if not parsed.criteria or not llm:
            return self.evaluate(qualification_rules=qualification_rules, conversation_text=conversation_text, previous_data=previous_data)

        extracted = dict(previous_data or {})
        field_criteria = [c for c in parsed.criteria if c.type == "field_present" and (c.field or c.key)]
        fields_to_extract = [str(c.field or c.key) for c in field_criteria]
        missing_fields = [f for f in fields_to_extract if not extracted.get(f)]

        try:
            try:
                from agno.agent import Agent
                from agno.models.openai import OpenAIChat
            except Exception:
                return self.evaluate(qualification_rules=qualification_rules, conversation_text=conversation_text, previous_data=extracted)

            llm_summary: str | None = None

            if missing_fields:
                extraction_rules = dict(qualification_rules or {})
                extraction_rules["required_fields"] = missing_fields

                messages = self._prompts.build_qualification_extraction_messages(
                    qualification_rules=extraction_rules,
                    conversation_text=conversation_text,
                    previous_data=extracted,
                )

                agent = Agent(
                    model=OpenAIChat(
                        id=llm.chat_model,
                        api_key=llm.api_key,
                        base_url=llm.base_url,
                        temperature=0.0,
                        timeout=20.0,
                    ),
                    output_schema=QualificationExtraction,
                    use_json_mode=True,
                    telemetry=False,
                    debug_mode=False,
                )

                out = await agent.arun(messages, stream=False)
                raw_content = getattr(out, "content", None)

                extraction: QualificationExtraction | None = None
                if isinstance(raw_content, QualificationExtraction):
                    extraction = raw_content
                elif isinstance(raw_content, dict):
                    try:
                        extraction = QualificationExtraction.model_validate(raw_content)
                    except Exception:
                        extraction = None

                if extraction:
                    llm_summary = (extraction.summary or "").strip() if extraction.summary else None
                    for item in extraction.fields:
                        if item.field in missing_fields and not extracted.get(item.field) and item.value:
                            extracted[item.field] = item.value

            llm_criteria = [c for c in parsed.criteria if c.type == "llm" and c.prompt]
            llm_results: dict[str, dict[str, Any]] = {}

            if llm_criteria:
                system = (
                    "Você avalia critérios de qualificação de leads.\n"
                    "Regras:\n"
                    "- Baseie-se apenas no texto fornecido.\n"
                    "- Responda met=true somente com evidência clara.\n"
                    "- Não invente fatos.\n"
                    "- Evidence deve ser um trecho curto (sem segredos), ou null.\n"
                )
                payload = {
                    "criteria": [{"key": c.key, "prompt": c.prompt} for c in llm_criteria],
                    "previous_data": dict(extracted or {}),
                    "conversation_text": conversation_text,
                }
                user = json.dumps(payload, ensure_ascii=False)

                eval_agent = Agent(
                    model=OpenAIChat(
                        id=llm.chat_model,
                        api_key=llm.api_key,
                        base_url=llm.base_url,
                        temperature=0.0,
                        timeout=20.0,
                    ),
                    output_schema=CriteriaEvalOutput,
                    use_json_mode=True,
                    telemetry=False,
                    debug_mode=False,
                )

                eval_out = await eval_agent.arun([{"role": "system", "content": system}, {"role": "user", "content": user}], stream=False)
                eval_raw = getattr(eval_out, "content", None)

                parsed_eval: CriteriaEvalOutput | None = None
                if isinstance(eval_raw, CriteriaEvalOutput):
                    parsed_eval = eval_raw
                elif isinstance(eval_raw, dict):
                    try:
                        parsed_eval = CriteriaEvalOutput.model_validate(eval_raw)
                    except Exception:
                        parsed_eval = None

                if parsed_eval:
                    if not llm_summary and parsed_eval.summary:
                        llm_summary = parsed_eval.summary
                    for key, item in parsed_eval.as_index().items():
                        llm_results[key] = item.model_dump(mode="json", exclude_none=True)

            engine_res = self._engine.evaluate(
                parsed=parsed,
                conversation_text=conversation_text,
                previous_data=extracted,
                llm_results=llm_results,
            )
            summary = llm_summary or engine_res.summary

            return QualificationResult(
                score=engine_res.score,
                threshold=engine_res.threshold,
                required_met=engine_res.required_met,
                criteria_met=engine_res.criteria_met,
                criteria_details=[c.as_db_dict() for c in engine_res.criteria_results],
                extracted=engine_res.extracted,
                qualified_at=engine_res.qualified_at,
                summary=summary,
            )
        except Exception:
            pass

        return self.evaluate(qualification_rules=qualification_rules, conversation_text=conversation_text, previous_data=extracted)

    def evaluate(
        self,
        *,
        qualification_rules: dict[str, Any],
        conversation_text: str,
        previous_data: dict[str, Any],
    ) -> QualificationResult:
        parsed = self._engine.parse_rules(qualification_rules)
        engine_res = self._engine.evaluate(
            parsed=parsed,
            conversation_text=conversation_text,
            previous_data=previous_data,
        )
        return QualificationResult(
            score=engine_res.score,
            threshold=engine_res.threshold,
            required_met=engine_res.required_met,
            criteria_met=engine_res.criteria_met,
            criteria_details=[c.as_db_dict() for c in engine_res.criteria_results],
            extracted=engine_res.extracted,
            qualified_at=engine_res.qualified_at,
            summary=engine_res.summary,
        )
