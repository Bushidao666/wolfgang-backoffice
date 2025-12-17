from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class QualificationResult:
    score: float
    criteria_met: dict[str, bool]
    extracted: dict[str, Any]
    qualified_at: datetime | None
    summary: str


class QualificationService:
    def evaluate(
        self,
        *,
        qualification_rules: dict[str, Any],
        conversation_text: str,
        previous_data: dict[str, Any],
    ) -> QualificationResult:
        required = list(qualification_rules.get("required_fields") or [])
        threshold = float(qualification_rules.get("threshold") or 1.0)

        extracted = dict(previous_data or {})
        criteria_met: dict[str, bool] = {}

        for field in required:
            if field in extracted and extracted[field]:
                criteria_met[field] = True
                continue
            value = self._extract_field(field, conversation_text)
            if value:
                extracted[field] = value
                criteria_met[field] = True
            else:
                criteria_met[field] = False

        met_count = sum(1 for v in criteria_met.values() if v)
        score = (met_count / max(1, len(required))) if required else 0.0

        qualified = score >= threshold and all(criteria_met.values()) if required else False
        qualified_at = datetime.now(timezone.utc) if qualified else None

        summary_parts = [f"{k}={extracted.get(k)}" for k in required if extracted.get(k)]
        summary = " | ".join(summary_parts) if summary_parts else ""

        return QualificationResult(
            score=score,
            criteria_met=criteria_met,
            extracted=extracted,
            qualified_at=qualified_at,
            summary=summary,
        )

    def _extract_field(self, field: str, text: str) -> str | None:
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
