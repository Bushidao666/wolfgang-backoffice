from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any


def _json_size_bytes(value: Any) -> int:
    try:
        return len(json.dumps(value, ensure_ascii=False, default=str).encode("utf-8"))
    except Exception:
        # Worst-case fallback: represent as string.
        return len(str(value).encode("utf-8"))


def _truncate_str(value: str, *, max_chars: int) -> str:
    if len(value) <= max_chars:
        return value
    return value[: max(0, max_chars - 12)] + "...[truncated]"


def _truncate_json(value: Any, *, max_depth: int, max_list_items: int, max_str_chars: int) -> Any:
    if value is None or isinstance(value, (int, float, bool)):
        return value
    if isinstance(value, str):
        return _truncate_str(value, max_chars=max_str_chars)
    if max_depth <= 0:
        return "[truncated]"
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in list(value.items())[:max_list_items]:
            out[str(k)] = _truncate_json(v, max_depth=max_depth - 1, max_list_items=max_list_items, max_str_chars=max_str_chars)
        if len(value) > max_list_items:
            out["__truncated__"] = True
        return out
    if isinstance(value, (list, tuple)):
        items = [_truncate_json(v, max_depth=max_depth - 1, max_list_items=max_list_items, max_str_chars=max_str_chars) for v in list(value)[:max_list_items]]
        if len(value) > max_list_items:
            items.append("...[truncated]")
        return items
    return _truncate_str(str(value), max_chars=max_str_chars)


@dataclass(frozen=True)
class PayloadLimits:
    tool_args_max_bytes: int = 25_000
    tool_result_max_bytes: int = 250_000
    tool_max_depth: int = 6
    tool_max_list_items: int = 80
    tool_max_str_chars: int = 8_000

    media_download_max_bytes: int = 15_000_000
    stt_audio_max_bytes: int = 10_000_000
    vision_image_max_bytes: int = 6_000_000

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "PayloadLimits":
        e = env or os.environ

        def _int(key: str, default: int) -> int:
            raw = (e.get(key) or "").strip()
            if not raw:
                return default
            try:
                value = int(raw)
                return value if value > 0 else default
            except Exception:
                return default

        return cls(
            tool_args_max_bytes=_int("PAYLOAD_LIMIT_TOOL_ARGS_MAX_BYTES", cls.tool_args_max_bytes),
            tool_result_max_bytes=_int("PAYLOAD_LIMIT_TOOL_RESULT_MAX_BYTES", cls.tool_result_max_bytes),
            tool_max_depth=_int("PAYLOAD_LIMIT_TOOL_MAX_DEPTH", cls.tool_max_depth),
            tool_max_list_items=_int("PAYLOAD_LIMIT_TOOL_MAX_LIST_ITEMS", cls.tool_max_list_items),
            tool_max_str_chars=_int("PAYLOAD_LIMIT_TOOL_MAX_STR_CHARS", cls.tool_max_str_chars),
            media_download_max_bytes=_int("PAYLOAD_LIMIT_MEDIA_DOWNLOAD_MAX_BYTES", cls.media_download_max_bytes),
            stt_audio_max_bytes=_int("PAYLOAD_LIMIT_STT_AUDIO_MAX_BYTES", cls.stt_audio_max_bytes),
            vision_image_max_bytes=_int("PAYLOAD_LIMIT_VISION_IMAGE_MAX_BYTES", cls.vision_image_max_bytes),
        )

    def ensure_tool_args(self, arguments: Any, *, tool_name: str | None = None) -> None:
        size = _json_size_bytes(arguments)
        if size <= self.tool_args_max_bytes:
            return
        name = tool_name or "tool"
        raise ValueError(f"{name} arguments too large ({size} bytes > {self.tool_args_max_bytes})")

    def truncate_tool_result(self, result: Any) -> Any:
        """
        Truncate tool results to keep memory/log/audit bounded.

        This does not guarantee the final object is below `tool_result_max_bytes`, but it reduces risk.
        """
        truncated = _truncate_json(
            result,
            max_depth=self.tool_max_depth,
            max_list_items=self.tool_max_list_items,
            max_str_chars=self.tool_max_str_chars,
        )
        size = _json_size_bytes(truncated)
        if size <= self.tool_result_max_bytes:
            return truncated
        # Final fallback: return a compact string.
        return _truncate_str(str(truncated), max_chars=int(self.tool_result_max_bytes / 4))
