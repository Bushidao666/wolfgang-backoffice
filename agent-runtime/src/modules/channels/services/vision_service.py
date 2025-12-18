from __future__ import annotations

import base64
import logging

import httpx

from common.config.settings import get_settings
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.integrations.openai_resolver import OpenAIResolver

logger = logging.getLogger(__name__)


class VisionService:
    def __init__(self, *, db: SupabaseDb | None = None):
        self._openai = OpenAIResolver(db) if db else None

    async def describe(self, *, company_id: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        if self._openai:
            resolved = await self._openai.resolve_optional(company_id=company_id)
            if not resolved:
                raise RuntimeError("OpenAI integration not configured for vision")
            api_key = resolved.api_key
            base_url = resolved.base_url
            model = resolved.vision_model
        else:
            settings = get_settings()
            if not settings.openai_api_key:
                raise RuntimeError("OPENAI_API_KEY is required for vision")
            api_key = settings.openai_api_key
            base_url = settings.openai_base_url
            model = settings.openai_vision_model

        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime_type};base64,{b64}"

        messages = [
            {
                "role": "system",
                "content": "Você descreve imagens e faz OCR quando relevante. Responda em PT-BR, de forma objetiva.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Descreva a imagem e extraia texto (OCR) se houver."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ]

        payload = {"model": model, "messages": messages, "temperature": 0.2}

        async with httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=60.0,
        ) as client:
            res = await client.post("/chat/completions", json=payload)
            res.raise_for_status()
            data = res.json()

        try:
            text = data["choices"][0]["message"]["content"]
        except Exception as exc:
            raise RuntimeError("Unexpected vision response") from exc

        logger.info("vision.completed", extra={"extra": {"chars": len(text or '')}})
        return (text or "").strip()
