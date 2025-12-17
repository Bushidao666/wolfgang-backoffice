from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class LeadQualifiedEvent:
    lead_id: str
    company_id: str
    score: float
    criteria: list[str]
    summary: str
    occurred_at: datetime
    payload: dict[str, Any] | None = None

