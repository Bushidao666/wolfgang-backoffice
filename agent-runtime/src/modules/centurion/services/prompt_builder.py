from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from modules.centurion.domain.message import Message


@dataclass(frozen=True)
class Prompt:
    system: str
    messages: list[dict[str, str]]


class PromptBuilder:
    def build(
        self,
        *,
        centurion_config: dict[str, Any],
        history: list[Message],
        consolidated_user_message: str,
        pending_count: int,
        rag_items: list[dict[str, Any]] | None = None,
        knowledge_items: list[dict[str, Any]] | None = None,
    ) -> Prompt:
        base_prompt = centurion_config.get("prompt") or "Você é um SDR educado e objetivo."
        system_prompt = base_prompt

        if rag_items:
            formatted = []
            for item in rag_items:
                summary = item.get("summary") or ""
                if isinstance(summary, str) and summary.strip():
                    formatted.append(f"- {summary.strip()}")
            if formatted:
                system_prompt += "\n\n<memoria_long_term>\n" + "\n".join(formatted[:10]) + "\n</memoria_long_term>"

        if knowledge_items:
            formatted = []
            for item in knowledge_items:
                title = item.get("document_title") or "Documento"
                content = item.get("content") or ""
                if isinstance(content, str) and content.strip():
                    formatted.append(f"[{title}] {content.strip()}")
            if formatted:
                system_prompt += "\n\n<knowledge_base>\n" + "\n\n".join(formatted[:8]) + "\n</knowledge_base>"

        base_messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

        trimmed_history = self._trim_pending_from_history(history, pending_count=pending_count)

        for msg in trimmed_history:
            content = msg.as_prompt_text
            if not content:
                continue
            role = "user" if msg.direction == "inbound" else "assistant"
            base_messages.append({"role": role, "content": content})

        base_messages.append({"role": "user", "content": consolidated_user_message})
        return Prompt(system=system_prompt, messages=base_messages)

    def _trim_pending_from_history(self, history: list[Message], *, pending_count: int) -> list[Message]:
        if pending_count <= 1:
            return history

        trimmed = list(history)
        to_remove = pending_count
        while trimmed and to_remove > 0:
            last = trimmed[-1]
            trimmed.pop()
            if last.direction == "inbound":
                to_remove -= 1
        return trimmed
