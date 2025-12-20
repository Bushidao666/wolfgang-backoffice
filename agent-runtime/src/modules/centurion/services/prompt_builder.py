from __future__ import annotations

import json
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
        include_media_tools: bool = False,
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

        if include_media_tools:
            system_prompt += (
                "\n\n<media_tools>\n"
                "Se você decidir enviar uma mídia ao usuário, use a tool `media_search_assets` para encontrar assets.\n"
                "Depois, inclua um bloco no FINAL da sua resposta (não mostre para o usuário) no formato:\n"
                "```media\n"
                "[{\"asset_id\":\"<uuid>\",\"type\":\"image|video|audio|document\",\"caption\":\"opcional\"}]\n"
                "```\n"
                "Use somente asset_id retornado pela tool.\n"
                "</media_tools>"
            )

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

    def build_qualification_extraction_messages(
        self,
        *,
        qualification_rules: dict[str, Any],
        conversation_text: str,
        previous_data: dict[str, Any] | None = None,
    ) -> list[dict[str, str]]:
        """
        Prompt used to extract structured qualification fields.

        The model output is parsed into a Pydantic schema (Agno structured output),
        and the runtime applies deterministic rules for score/threshold decisions.
        """
        required_fields = list(qualification_rules.get("required_fields") or [])
        threshold = qualification_rules.get("threshold")

        system = (
            "Você é um extrator de dados para qualificação de leads.\n"
            "Regras:\n"
            "- Extraia apenas informações explicitamente presentes no texto.\n"
            "- Não invente valores.\n"
            "- Se não houver evidência suficiente, use null.\n"
            "- Preserve o formato original quando possível (ex.: 'R$ 1.500,00', '12/12/2025').\n"
            "- Quando possível, inclua uma evidência curta (trecho) para cada extração.\n"
        )

        payload = {
            "qualification_rules": {"required_fields": required_fields, "threshold": threshold},
            "previous_data": dict(previous_data or {}),
            "conversation_text": conversation_text,
        }
        user = json.dumps(payload, ensure_ascii=False)
        return [{"role": "system", "content": system}, {"role": "user", "content": user}]
