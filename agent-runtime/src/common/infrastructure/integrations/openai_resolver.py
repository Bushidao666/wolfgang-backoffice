from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from common.config.settings import get_settings
from common.infrastructure.database.supabase_client import SupabaseDb

from .resolver import CompanyIntegrationResolver


@dataclass(frozen=True)
class OpenAIResolved:
    api_key: str
    base_url: str
    chat_model: str
    vision_model: str
    stt_model: str
    embedding_model: str


def _read_str(obj: dict[str, Any], *keys: str) -> str | None:
    for k in keys:
        v = obj.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


class OpenAIResolver:
    def __init__(self, db: SupabaseDb, *, cache_ttl_s: float = 30.0):
        self._integrations = CompanyIntegrationResolver(db, cache_ttl_s=cache_ttl_s)

    async def resolve_optional(self, *, company_id: str) -> OpenAIResolved | None:
        settings = get_settings()

        try:
            resolved = await self._integrations.resolve(company_id=company_id, provider="openai")
        except Exception:
            resolved = None

        if resolved:
            api_key = _read_str(resolved.secrets, "api_key") or ""
            if api_key:
                base_url = _read_str(resolved.config, "base_url", "api_base_url") or settings.openai_base_url
                return OpenAIResolved(
                    api_key=api_key,
                    base_url=base_url,
                    chat_model=_read_str(resolved.config, "chat_model") or settings.openai_chat_model,
                    vision_model=_read_str(resolved.config, "vision_model") or settings.openai_vision_model,
                    stt_model=_read_str(resolved.config, "stt_model") or settings.openai_stt_model,
                    embedding_model=_read_str(resolved.config, "embedding_model") or settings.openai_embedding_model,
                )

        if settings.openai_api_key:
            return OpenAIResolved(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                chat_model=settings.openai_chat_model,
                vision_model=settings.openai_vision_model,
                stt_model=settings.openai_stt_model,
                embedding_model=settings.openai_embedding_model,
            )

        return None

    async def resolve(self, *, company_id: str) -> OpenAIResolved:
        resolved = await self.resolve_optional(company_id=company_id)
        if not resolved:
            raise RuntimeError("OpenAI integration is not configured for this company")
        return resolved

