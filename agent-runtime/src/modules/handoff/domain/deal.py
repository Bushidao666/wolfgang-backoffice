from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class Deal:
    company_id: str
    schema_name: str
    local_deal_id: str
    deal_index_id: str | None
    created_at: datetime
    payload: dict[str, Any]

