from __future__ import annotations

import logging

import httpx

from common.config.settings import get_settings
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.integrations.openai_resolver import OpenAIResolver

logger = logging.getLogger(__name__)


class SpeechToTextService:
    def __init__(self, *, db: SupabaseDb | None = None):
        self._openai = OpenAIResolver(db) if db else None

    async def transcribe(self, *, company_id: str, audio_bytes: bytes, filename: str = "audio.ogg") -> str:
        if self._openai:
            resolved = await self._openai.resolve_optional(company_id=company_id)
            if not resolved:
                raise RuntimeError("OpenAI integration not configured for speech-to-text")
            api_key = resolved.api_key
            base_url = resolved.base_url
            model = resolved.stt_model
        else:
            settings = get_settings()
            if not settings.openai_api_key:
                raise RuntimeError("OPENAI_API_KEY is required for speech-to-text")
            api_key = settings.openai_api_key
            base_url = settings.openai_base_url
            model = settings.openai_stt_model

        async with httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=60.0,
        ) as client:
            files = {"file": (filename, audio_bytes, "application/octet-stream")}
            data = {"model": model}
            res = await client.post("/audio/transcriptions", files=files, data=data)
            res.raise_for_status()
            payload = res.json()

        text = payload.get("text")
        if not isinstance(text, str):
            raise RuntimeError("Unexpected STT response")
        logger.info("stt.completed", extra={"extra": {"chars": len(text)}})
        return text.strip()
