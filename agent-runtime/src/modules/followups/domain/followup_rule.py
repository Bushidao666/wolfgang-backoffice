from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FollowupRule:
    id: str
    company_id: str
    centurion_id: str
    name: str
    inactivity_hours: int
    template: str
    max_attempts: int
    is_active: bool

