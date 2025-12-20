from __future__ import annotations

import json
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ChunkConfig:
    enabled: bool
    max_chars: int = 280
    delay_ms: int = 1500


class ResponseBuilder:
    def extract_media_plan(self, text: str) -> tuple[str, list[dict[str, str]]]:
        """
        Extract optional media instructions from a fenced ```media JSON``` block.

        Expected JSON:
          - single object: {"asset_id":"...","type":"image","caption":"..."}
          - or list of objects

        Returns (clean_text, media_plan). On parse errors, returns the original text with an empty plan.
        """

        raw = text or ""
        blocks = list(re.finditer(r"```media\s*([\s\S]*?)```", raw, flags=re.IGNORECASE))
        if not blocks:
            return raw, []

        plan: list[dict[str, str]] = []
        for m in blocks:
            payload = (m.group(1) or "").strip()
            if not payload:
                continue
            try:
                parsed = json.loads(payload)
            except Exception:
                continue

            items = parsed if isinstance(parsed, list) else [parsed]
            for item in items:
                if not isinstance(item, dict):
                    continue
                asset_id = str(item.get("asset_id") or item.get("id") or "").strip()
                mtype = str(item.get("type") or "").strip()
                caption = str(item.get("caption") or "").strip()
                if not asset_id:
                    continue
                if mtype not in ("audio", "image", "video", "document"):
                    continue
                entry = {"asset_id": asset_id, "type": mtype}
                if caption:
                    entry["caption"] = caption[:800]
                plan.append(entry)

        if len(plan) > 5:
            plan = plan[:5]

        cleaned = re.sub(r"```media\s*[\s\S]*?```", "", raw, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
        return cleaned, plan

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

    def build_outbound_messages(
        self,
        *,
        text: str,
        chunk_config: ChunkConfig,
        media_plan: list[dict[str, str]] | None = None,
    ) -> list[dict[str, str]]:
        """
        Build a sequence of outbound messages (text chunks + optional media).
        """

        messages: list[dict[str, str]] = []

        for chunk in self.split_into_chunks(text or "", chunk_config):
            messages.append({"type": "text", "text": chunk})

        for item in media_plan or []:
            asset_id = str(item.get("asset_id") or "").strip()
            mtype = str(item.get("type") or "").strip()
            caption = str(item.get("caption") or "").strip()
            if not asset_id:
                continue
            if mtype not in ("audio", "image", "video", "document"):
                continue
            msg: dict[str, str] = {"type": mtype, "asset_id": asset_id}
            if caption and mtype != "audio":
                msg["caption"] = caption[:800]
            messages.append(msg)

        return messages

    def _hard_split(self, text: str, max_chars: int) -> list[str]:
        parts: list[str] = []
        s = text.strip()
        while s:
            parts.append(s[:max_chars].strip())
            s = s[max_chars:].strip()
        return parts
