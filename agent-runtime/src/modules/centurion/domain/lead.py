from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class Lead:
    id: str
    company_id: str
    phone: str
    name: str | None = None
    lifecycle_stage: str = "new"
    is_qualified: bool = False
    qualification_score: float | None = None
    qualification_data: dict[str, Any] = field(default_factory=dict)
    centurion_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def with_qualification(self, *, score: float, data: dict[str, Any], qualified_at: datetime | None) -> "Lead":
        merged = dict(self.qualification_data or {})
        merged.update(data)
        return Lead(
            id=self.id,
            company_id=self.company_id,
            phone=self.phone,
            name=self.name,
            lifecycle_stage="qualified" if qualified_at else self.lifecycle_stage,
            is_qualified=qualified_at is not None,
            qualification_score=score,
            qualification_data=merged,
            centurion_id=self.centurion_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )

