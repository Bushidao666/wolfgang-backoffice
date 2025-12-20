from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

CriterionType = Literal["field_present", "llm"]


@dataclass(frozen=True)
class CriterionConfig:
    key: str
    type: CriterionType
    weight: float
    required: bool
    field: str | None = None
    prompt: str | None = None
    label: str | None = None


@dataclass(frozen=True)
class CriterionResult:
    key: str
    type: CriterionType
    weight: float
    required: bool
    met: bool
    evidence: dict[str, Any] | None
    field: str | None = None

    def as_db_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "key": self.key,
            "type": self.type,
            "weight": self.weight,
            "required": self.required,
            "met": self.met,
        }
        if self.field:
            payload["field"] = self.field
        if self.evidence is not None:
            payload["evidence"] = self.evidence
        return payload


@dataclass(frozen=True)
class ParsedQualificationRules:
    threshold: float
    criteria: list[CriterionConfig]


@dataclass(frozen=True)
class CriteriaEngineResult:
    score: float
    threshold: float
    required_met: bool
    is_qualified: bool
    qualified_at: datetime | None
    criteria_results: list[CriterionResult]
    criteria_met: dict[str, bool]
    extracted: dict[str, Any]
    summary: str


def compute_rules_hash(qualification_rules: dict[str, Any]) -> str:
    """
    Stable hash for a config snapshot (used as a lightweight "version" in explainability).
    """

    try:
        raw = json.dumps(qualification_rules or {}, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except Exception:
        raw = str(qualification_rules)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class CriteriaEngine:
    def parse_rules(self, qualification_rules: dict[str, Any]) -> ParsedQualificationRules:
        rules = qualification_rules or {}

        threshold = rules.get("threshold")
        try:
            threshold = float(threshold) if threshold is not None else 1.0
        except Exception:
            threshold = 1.0
        threshold = _clamp(threshold, 0.0, 1.0)

        raw_criteria = rules.get("criteria")
        criteria: list[CriterionConfig] = []

        if isinstance(raw_criteria, list) and any(isinstance(i, dict) for i in raw_criteria):
            seen: set[str] = set()
            for item in raw_criteria:
                if not isinstance(item, dict):
                    continue
                key = _as_str(item.get("key"))
                if not key or key in seen:
                    continue

                c_type: CriterionType = "llm" if item.get("type") == "llm" else "field_present"

                weight = item.get("weight")
                try:
                    weight = float(weight) if weight is not None else 0.0
                except Exception:
                    weight = 0.0
                weight = _clamp(weight, 0.0, 1.0)

                required = bool(item.get("required") or False)
                label = _as_optional_str(item.get("label"), max_len=120)

                field = None
                prompt = None
                if c_type == "field_present":
                    field = _as_optional_str(item.get("field"), max_len=128) or key
                else:
                    prompt = _as_optional_str(item.get("prompt"), max_len=2000)

                criteria.append(
                    CriterionConfig(
                        key=key,
                        type=c_type,
                        weight=weight,
                        required=required,
                        field=field,
                        prompt=prompt,
                        label=label,
                    )
                )
                seen.add(key)

            return ParsedQualificationRules(threshold=threshold, criteria=criteria)

        required_fields = rules.get("required_fields") or []
        required: list[str] = []
        if isinstance(required_fields, list):
            for f in required_fields:
                s = _as_str(f)
                if s:
                    required.append(s)

        # Deduplicate while preserving order.
        deduped: list[str] = []
        seen_fields: set[str] = set()
        for field in required:
            if field in seen_fields:
                continue
            seen_fields.add(field)
            deduped.append(field)

        if deduped:
            w = 1.0 / max(1, len(deduped))
            criteria = [
                CriterionConfig(key=field, type="field_present", weight=w, required=True, field=field) for field in deduped
            ]

        return ParsedQualificationRules(threshold=threshold, criteria=criteria)

    def evaluate(
        self,
        *,
        parsed: ParsedQualificationRules,
        conversation_text: str,
        previous_data: dict[str, Any] | None,
        llm_results: dict[str, dict[str, Any]] | None = None,
    ) -> CriteriaEngineResult:
        extracted = dict(previous_data or {})
        initial_keys = set(extracted.keys())
        llm_results = llm_results or {}

        results: list[CriterionResult] = []

        for criterion in parsed.criteria:
            if criterion.type == "field_present":
                field = criterion.field or criterion.key
                value = _normalize_field_value(extracted.get(field))

                source = "previous_data" if field in initial_keys else "missing"

                if not value:
                    guessed = _heuristic_extract(field, conversation_text)
                    if guessed:
                        extracted[field] = guessed
                        value = guessed
                        source = "heuristic"

                met = bool(value)
                evidence: dict[str, Any] = {
                    "field": field,
                    "source": source,
                    "value": (value[:200] if isinstance(value, str) else value),
                }

                results.append(
                    CriterionResult(
                        key=criterion.key,
                        type=criterion.type,
                        weight=criterion.weight,
                        required=criterion.required,
                        met=met,
                        evidence=evidence,
                        field=field,
                    )
                )
                continue

            llm_item = llm_results.get(criterion.key)
            met = bool(llm_item.get("met")) if isinstance(llm_item, dict) else False
            evidence = None
            if isinstance(llm_item, dict):
                evidence_value = llm_item.get("evidence")
                confidence = llm_item.get("confidence")
                payload: dict[str, Any] = {}
                if isinstance(evidence_value, str) and evidence_value.strip():
                    payload["evidence"] = evidence_value.strip()[:400]
                if isinstance(confidence, (int, float)) and 0.0 <= float(confidence) <= 1.0:
                    payload["confidence"] = float(confidence)
                evidence = payload or None

            if evidence is None:
                evidence = {"reason": "llm_not_evaluated"}

            results.append(
                CriterionResult(
                    key=criterion.key,
                    type=criterion.type,
                    weight=criterion.weight,
                    required=criterion.required,
                    met=met,
                    evidence=evidence,
                )
            )

        criteria_met = {r.key: r.met for r in results}
        required_met = all(r.met for r in results if r.required) if results else False
        score = self._compute_score(results)

        is_qualified = bool(results) and required_met and score >= parsed.threshold
        qualified_at = datetime.now(timezone.utc) if is_qualified else None

        summary = self._build_summary(results, extracted)

        return CriteriaEngineResult(
            score=score,
            threshold=parsed.threshold,
            required_met=required_met,
            is_qualified=is_qualified,
            qualified_at=qualified_at,
            criteria_results=results,
            criteria_met=criteria_met,
            extracted=extracted,
            summary=summary,
        )

    def _compute_score(self, criteria_results: list[CriterionResult]) -> float:
        if not criteria_results:
            return 0.0

        total_weight = sum(r.weight for r in criteria_results if r.weight > 0)
        if total_weight > 0:
            met_weight = sum(r.weight for r in criteria_results if r.met)
            return _clamp(met_weight / total_weight, 0.0, 1.0)

        met_count = sum(1 for r in criteria_results if r.met)
        return _clamp(met_count / max(1, len(criteria_results)), 0.0, 1.0)

    def _build_summary(self, criteria_results: list[CriterionResult], extracted: dict[str, Any]) -> str:
        parts: list[str] = []
        for c in criteria_results:
            if c.type != "field_present" or not c.field:
                continue
            value = extracted.get(c.field)
            if not value:
                continue
            if isinstance(value, str):
                v = value.strip()
                if not v:
                    continue
                parts.append(f"{c.field}={v[:120]}")
            else:
                parts.append(f"{c.field}={value}")

        summary = " | ".join(parts)
        return summary[:800]


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()[:64]
    return str(value).strip()[:64]


def _as_optional_str(value: Any, *, max_len: int) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        trimmed = value.strip()
        return trimmed[:max_len] if trimmed else None
    try:
        s = str(value).strip()
        return s[:max_len] if s else None
    except Exception:
        return None


def _normalize_field_value(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        trimmed = value.strip()
        return trimmed if trimmed else None
    return str(value).strip() or None


def _heuristic_extract(field: str, text: str) -> str | None:
    if not field or not text:
        return None

    if field == "budget":
        m = re.search(r"(r\$\s*\d+[\d\.,]*)", text, flags=re.I)
        return m.group(1) if m else None

    if field == "date":
        m = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})", text)
        return m.group(1) if m else None

    if field == "location":
        m = re.search(r"(bairro|rua|avenida|av\.|cidade)\s+([\w\s]{3,40})", text, flags=re.I)
        return m.group(0).strip() if m else None

    return None


def _clamp(value: float, min_value: float, max_value: float) -> float:
    if value < min_value:
        return min_value
    if value > max_value:
        return max_value
    return value
