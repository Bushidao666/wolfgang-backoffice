import pytest

from modules.tools.services.schema_validator import SchemaValidationError, SchemaValidator


def test_validate_schema_rejects_invalid_jsonschema():
    validator = SchemaValidator()
    with pytest.raises(SchemaValidationError) as err:
        validator.validate_schema({"type": "object", "properties": {"x": {"type": "nope"}}})
    assert "not a valid JSON Schema" in str(err.value)
    assert err.value.errors


def test_validate_instance_returns_human_errors():
    validator = SchemaValidator()
    schema = {"type": "object", "properties": {"x": {"type": "number"}}, "required": ["x"]}

    with pytest.raises(SchemaValidationError) as err:
        validator.validate_instance(schema, {"x": "nope"}, label="payload")

    assert "payload does not match schema" in str(err.value)
    assert any("x" in e for e in err.value.errors)

