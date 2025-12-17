from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MemoryWindow:
    max_messages: int = 25

    def clamp(self, count: int) -> int:
        return max(1, min(self.max_messages, count))

