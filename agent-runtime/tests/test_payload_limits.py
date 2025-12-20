import pytest

from common.security.payload_limits import PayloadLimits


def test_payload_limits_rejects_large_tool_args():
    limits = PayloadLimits()
    huge = {"x": "a" * 30_000}
    with pytest.raises(ValueError):
        limits.ensure_tool_args(huge, tool_name="t")


def test_payload_limits_truncates_large_results():
    limits = PayloadLimits(tool_max_str_chars=100)
    out = limits.truncate_tool_result("x" * 1000)
    assert isinstance(out, str)
    assert "truncated" in out
    assert len(out) <= 120


def test_payload_limits_truncates_nested_json():
    limits = PayloadLimits(tool_max_depth=2, tool_max_list_items=2, tool_max_str_chars=50)
    result = {"a": ["x" * 500, "y" * 500, "z" * 500], "b": {"c": {"d": "x" * 500}}}
    truncated = limits.truncate_tool_result(result)
    assert isinstance(truncated, dict)
    assert isinstance(truncated["a"], list)
