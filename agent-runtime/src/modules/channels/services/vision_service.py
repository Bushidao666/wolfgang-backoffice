from __future__ import annotations

import base64
import logging

import httpx

from common.config.settings import get_settings
from config.openai.config import OPENAI_BASE_URL, OPENAI_VISION_MODEL

logger = logging.getLogger(__name__)


class VisionService:
    async def describe(self, *, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for vision")

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

        payload = {"model": OPENAI_VISION_MODEL, "messages": messages, "temperature": 0.2}

        async with httpx.AsyncClient(
            base_url=OPENAI_BASE_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
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

