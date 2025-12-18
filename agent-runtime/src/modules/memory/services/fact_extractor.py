from __future__ import annotations

import json
import logging
import re
from typing import Any

from openai import AsyncOpenAI

from common.config.settings import get_settings
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.integrations.openai_resolver import OpenAIResolver
from modules.memory.domain.fact import Fact

logger = logging.getLogger(__name__)


class FactExtractor:
    def __init__(self, *, db: SupabaseDb | None = None):
        self._openai = OpenAIResolver(db) if db else None

    async def extract(self, *, company_id: str, conversation_text: str) -> list[Fact]:
        text = (conversation_text or "").strip()
        if not text:
            return []

        if self._openai:
            resolved = await self._openai.resolve_optional(company_id=company_id)
            if not resolved:
                return self._fallback_extract(text)
            api_key = resolved.api_key
            base_url = resolved.base_url
            model = resolved.chat_model
        else:
            settings = get_settings()
            if not settings.openai_api_key:
                return self._fallback_extract(text)
            api_key = settings.openai_api_key
            base_url = settings.openai_base_url
            model = settings.openai_chat_model

        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        system = (
            "Você extrai fatos úteis sobre um lead a partir de uma conversa. "
            "Retorne APENAS JSON (sem markdown) no formato: "
            "[{ \"text\": string, \"category\": \"personal\"|\"preference\"|\"requirement\"|\"history\" }]. "
            "Fatos devem ser atômicos e deduplicados."
        )
        user = f"Conversa:\n{text}\n\nExtraia fatos relevantes."

        res = await client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.1,
        )

        content = res.choices[0].message.content if res.choices else None
        if not content:
            return []

        try:
            parsed = json.loads(content)
        except Exception:
            logger.warning("facts.invalid_json", extra={"extra": {"content": content[:200]}})
            return self._fallback_extract(text)

        facts: list[Fact] = []
        if isinstance(parsed, list):
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                t = item.get("text")
                c = item.get("category")
                if isinstance(t, str) and t.strip() and isinstance(c, str) and c.strip():
                    facts.append(Fact(text=t.strip(), category=c.strip()))

        return self._dedupe(facts)

    def _dedupe(self, facts: list[Fact]) -> list[Fact]:
        seen: set[str] = set()
        out: list[Fact] = []
        for f in facts:
            key = f"{f.category}:{f.text.lower()}"
            if key in seen:
                continue
            seen.add(key)
            out.append(f)
        return out

    def _fallback_extract(self, text: str) -> list[Fact]:
        facts: list[Fact] = []

        email = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, flags=re.I)
        if email:
            facts.append(Fact(text=f"Email informado: {email.group(0)}", category="personal"))

        phone = re.search(r"\+?\d[\d\s().-]{7,}\d", text)
        if phone:
            facts.append(Fact(text=f"Telefone mencionado: {phone.group(0)}", category="personal"))

        budget = re.search(r"(R\$\s*\d+[\d.,]*)", text, flags=re.I)
        if budget:
            facts.append(Fact(text=f"Orçamento mencionado: {budget.group(1)}", category="requirement"))

        date = re.search(r"(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)", text)
        if date:
            facts.append(Fact(text=f"Data mencionada: {date.group(1)}", category="requirement"))

        return self._dedupe(facts)
