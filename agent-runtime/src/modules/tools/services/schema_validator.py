from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from jsonschema import exceptions, validators

_MAX_SCHEMA_BYTES = 200_000


class SchemaValidationError(ValueError):
    def __init__(self, message: str, *, errors: list[str] | None = None):
        super().__init__(message)
        self.errors = errors or []


def _schema_cache_key(schema: dict[str, Any]) -> str:
    try:
        raw = json.dumps(schema, sort_keys=True, ensure_ascii=False)
        if len(raw.encode("utf-8")) > _MAX_SCHEMA_BYTES:
            raise SchemaValidationError("schema is too large", errors=[f"max_bytes={_MAX_SCHEMA_BYTES}"])
        return raw
    except SchemaValidationError:
        raise
    except Exception:
        return str(schema)


@lru_cache(maxsize=256)
def _compile_validator(schema_key: str) -> Any:
    schema = json.loads(schema_key)
    cls = validators.validator_for(schema)
    cls.check_schema(schema)
    return cls(schema)


class SchemaValidator:
    def validate_schema(self, schema: dict[str, Any], *, label: str = "schema") -> None:
        try:
            # Guard against pathological schemas (DoS / memory blowups).
            _schema_cache_key(schema)
            cls = validators.validator_for(schema)
            cls.check_schema(schema)
        except exceptions.SchemaError as err:
            raise SchemaValidationError(f"{label} is not a valid JSON Schema", errors=[str(err)]) from err

    def validate_instance(self, schema: dict[str, Any], instance: Any, *, label: str = "payload") -> None:
        self.validate_schema(schema, label="schema")
        key = _schema_cache_key(schema)
        try:
            validator = _compile_validator(key)
        except Exception as err:
            raise SchemaValidationError("Failed to compile JSON Schema", errors=[str(err)]) from err

        errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.absolute_path))
        if not errors:
            return

        messages: list[str] = []
        for e in errors[:20]:
            path = ".".join([str(p) for p in e.absolute_path]) or "$"
            messages.append(f"{path}: {e.message}")

        raise SchemaValidationError(f"{label} does not match schema", errors=messages)
