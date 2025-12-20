from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class MediaChannelPlan(BaseModel):
    channel: Literal["meta_ads", "google_ads", "tiktok_ads", "organic", "other"] = Field(
        ...,
        description="Channel or platform family.",
    )
    budget_share: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Budget share (0-1) within the overall plan.",
    )
    rationale: str = Field(default="", description="Why this channel fits the lead context.")

    @field_validator("rationale", mode="before")
    @classmethod
    def _normalize_rationale(cls, value: Any) -> Any:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()[:800]
        return value


class MediaPlan(BaseModel):
    """
    Structured media plan (vNext placeholder).

    This model is used as a stable contract for downstream features (media tools, explainability).
    """

    objective: str = Field(..., min_length=1, description="Primary objective for the plan.")
    total_budget: str | None = Field(default=None, description="Budget as mentioned by the lead (keep original format).")
    timeframe: str | None = Field(default=None, description="Time window / desired launch date.")
    channels: list[MediaChannelPlan] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list, description="KPIs to track (e.g., leads, CPL, ROAS).")
    notes: str = Field(default="", description="Important constraints, disclaimers, or assumptions.")
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("objective", mode="before")
    @classmethod
    def _normalize_objective(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()[:200]
        return value

    @field_validator("total_budget", "timeframe", mode="before")
    @classmethod
    def _normalize_optional_str(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed[:200] if trimmed else None
        return value

    @field_validator("notes", mode="before")
    @classmethod
    def _normalize_notes(cls, value: Any) -> Any:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()[:1200]
        return value

    def as_db_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json", exclude_none=True)
