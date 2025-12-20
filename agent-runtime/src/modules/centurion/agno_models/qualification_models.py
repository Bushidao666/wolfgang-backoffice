from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class QualificationFieldExtraction(BaseModel):
    field: str = Field(..., min_length=1, description="Field name to extract, usually from qualification_rules.required_fields.")
    value: str | None = Field(
        default=None,
        description="Extracted value for the field. Use null if not present in the conversation.",
    )
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Confidence in the extracted value (0-1).",
    )
    evidence: str | None = Field(
        default=None,
        description="Short quote/snippet supporting the extraction. Must not include secrets.",
    )

    @field_validator("field")
    @classmethod
    def _normalize_field(cls, value: str) -> str:
        return value.strip()

    @field_validator("value", mode="before")
    @classmethod
    def _normalize_value(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return value

    @field_validator("evidence", mode="before")
    @classmethod
    def _normalize_evidence(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                return None
            return trimmed[:400]
        return value


class QualificationExtraction(BaseModel):
    """
    Minimal structured output to support deterministic qualification.

    The runtime still computes the final score/qualified decision deterministically
    using `qualification_rules` (threshold + required_fields).
    """

    fields: list[QualificationFieldExtraction] = Field(default_factory=list)
    summary: str | None = Field(
        default=None,
        description="Short summary of extracted qualification context (no secrets).",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional extra data (keep small, no secrets).",
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

    def as_db_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json", exclude_none=True)
