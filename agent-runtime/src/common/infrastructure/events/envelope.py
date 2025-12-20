from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping

from pydantic import BaseModel, Field, ValidationError


class EventEnvelopeModel(BaseModel):
    id: str = Field(min_length=8)
    type: str = Field(min_length=1)
    version: int = Field(ge=1)
    occurred_at: datetime
    company_id: str = Field(min_length=3)
    source: str = Field(min_length=1)
    correlation_id: str = Field(min_length=8)
    causation_id: str | None = Field(default=None)
    payload: dict[str, Any] = Field(default_factory=dict)


@dataclass(frozen=True)
class EventEnvelope:
    id: str
    type: str
    version: int
    occurred_at: datetime
    company_id: str
    source: str
    correlation_id: str
    causation_id: str | None
    payload: dict[str, Any]

    @property
    def occurred_at_iso(self) -> str:
        return self.occurred_at.astimezone(timezone.utc).isoformat()


class EventParseError(ValueError):
    def __init__(self, message: str, *, reason: str, raw: str | None = None):
        super().__init__(message)
        self.reason = reason
        self.raw = raw


def parse_envelope(raw: str | bytes | Mapping[str, Any], *, expected_type: str | None = None) -> EventEnvelope:
    obj: Any
    if isinstance(raw, (bytes, bytearray)):
        try:
            obj = json.loads(raw.decode("utf-8"))
        except Exception as err:
            raise EventParseError("Invalid JSON", reason="invalid_json", raw="<bytes>") from err
    elif isinstance(raw, str):
        try:
            obj = json.loads(raw)
        except Exception as err:
            raise EventParseError("Invalid JSON", reason="invalid_json", raw=raw[:2000]) from err
    else:
        obj = dict(raw)

    if not isinstance(obj, dict):
        raise EventParseError("Invalid envelope type", reason="not_object")

    if expected_type and obj.get("type") != expected_type:
        raise EventParseError("Unexpected event type", reason="unexpected_type")

    try:
        model = EventEnvelopeModel.model_validate(obj)
    except ValidationError as err:
        raise EventParseError("Invalid event envelope", reason="validation_error") from err

    return EventEnvelope(
        id=str(model.id),
        type=str(model.type),
        version=int(model.version),
        occurred_at=model.occurred_at,
        company_id=str(model.company_id),
        source=str(model.source),
        correlation_id=str(model.correlation_id),
        causation_id=str(model.causation_id) if model.causation_id else None,
        payload=dict(model.payload or {}),
    )


def build_envelope(
    *,
    type: str,
    company_id: str,
    source: str,
    correlation_id: str,
    causation_id: str | None,
    payload: dict[str, Any],
    version: int = 1,
    event_id: str | None = None,
    occurred_at: datetime | None = None,
) -> dict[str, Any]:
    now = occurred_at or datetime.now(timezone.utc)
    return {
        "id": event_id or str(uuid.uuid4()),
        "type": type,
        "version": version,
        "occurred_at": now.astimezone(timezone.utc).isoformat(),
        "company_id": company_id,
        "source": source,
        "correlation_id": correlation_id,
        "causation_id": causation_id,
        "payload": payload,
    }

