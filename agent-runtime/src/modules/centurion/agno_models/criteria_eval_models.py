from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class CriteriaEvalItem(BaseModel):
    key: str = Field(..., min_length=1, description="Criterion key (must match the input criteria key).")
    met: bool = Field(..., description="Whether the criterion is met, based only on the provided context.")
    evidence: str | None = Field(
        default=None,
        description="Short quote/snippet supporting the decision (no secrets). Use null if not available.",
    )
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional confidence for the decision (0-1).",
    )

    @field_validator("key")
    @classmethod
    def _normalize_key(cls, value: str) -> str:
        return value.strip()[:64]

    @field_validator("evidence", mode="before")
    @classmethod
    def _normalize_evidence(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed[:400] if trimmed else None
        return value


class CriteriaEvalOutput(BaseModel):
    """
    Structured output for evaluating custom qualification criteria.

    This intentionally avoids long reasoning: evidence should be a short quote/snippet.
    """

    criteria: list[CriteriaEvalItem] = Field(default_factory=list)
    summary: str | None = Field(
        default=None,
        description="Optional short summary of the qualification context (no secrets).",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional metadata (keep small, no secrets).",
    )

    @field_validator("summary", mode="before")
    @classmethod
    def _normalize_summary(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed[:800] if trimmed else None
        return value

    def as_index(self) -> dict[str, CriteriaEvalItem]:
        indexed: dict[str, CriteriaEvalItem] = {}
        for item in self.criteria:
            if item.key and item.key not in indexed:
                indexed[item.key] = item
        return indexed

    def as_db_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json", exclude_none=True)

