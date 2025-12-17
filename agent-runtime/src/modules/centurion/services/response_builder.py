from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ChunkConfig:
    enabled: bool
    max_chars: int = 280
    delay_ms: int = 1500


class ResponseBuilder:
    def split_into_chunks(self, text: str, config: ChunkConfig) -> list[str]:
        cleaned = re.sub(r"\s+", " ", (text or "")).strip()
        if not cleaned:
            return []
        if not config.enabled or len(cleaned) <= config.max_chars:
            return [cleaned]

        chunks: list[str] = []
        current = ""

        for sentence in re.split(r"(?<=[.!?])\s+", cleaned):
            if not sentence:
                continue
            if len(sentence) > config.max_chars:
                for part in self._hard_split(sentence, config.max_chars):
                    chunks.append(part)
                current = ""
                continue

            if not current:
                current = sentence
                continue

            if len(current) + 1 + len(sentence) <= config.max_chars:
                current = f"{current} {sentence}"
                continue

            chunks.append(current)
            current = sentence

        if current:
            chunks.append(current)

        return [c.strip() for c in chunks if c.strip()]

    def _hard_split(self, text: str, max_chars: int) -> list[str]:
        parts: list[str] = []
        s = text.strip()
        while s:
            parts.append(s[:max_chars].strip())
            s = s[max_chars:].strip()
        return parts

