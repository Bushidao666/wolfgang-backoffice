from __future__ import annotations

import base64
import logging

import httpx

from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.integrations.openai_resolver import OpenAIResolver
from common.security.egress_policy import EgressPolicy
from common.security.payload_limits import PayloadLimits

logger = logging.getLogger(__name__)


class VisionService:
    def __init__(
        self,
        *,
        db: SupabaseDb | None = None,
        egress_policy: EgressPolicy | None = None,
        limits: PayloadLimits | None = None,
    ):
        self._openai = OpenAIResolver(db) if db else None
        self._egress = egress_policy or EgressPolicy.from_env()
        self._limits = limits or PayloadLimits.from_env()

    async def describe(self, *, company_id: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        if len(image_bytes) > int(self._limits.vision_image_max_bytes):
            raise ValueError("Image payload too large for vision")

        if self._openai:
            resolved = await self._openai.resolve_optional(company_id=company_id)
            if not resolved:
                raise RuntimeError("OpenAI integration not configured for vision")
            api_key = resolved.api_key
            base_url = resolved.base_url
            model = resolved.vision_model
        else:
            raise RuntimeError("SupabaseDb is required for vision (no env fallback)")

        await self._egress.assert_url_allowed(base_url)

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

        trimmed = (text or "").strip()
        if len(trimmed) > 8000:
            trimmed = trimmed[:8000]
        logger.info("vision.completed", extra={"extra": {"chars": len(trimmed)}})
        return trimmed
