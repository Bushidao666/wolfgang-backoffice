from __future__ import annotations

import logging

import httpx

from common.config.settings import get_settings
from config.openai.config import OPENAI_BASE_URL, OPENAI_STT_MODEL

logger = logging.getLogger(__name__)


class SpeechToTextService:
    async def transcribe(self, *, audio_bytes: bytes, filename: str = "audio.ogg") -> str:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for speech-to-text")

        async with httpx.AsyncClient(
            base_url=OPENAI_BASE_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            timeout=60.0,
        ) as client:
            files = {"file": (filename, audio_bytes, "application/octet-stream")}
            data = {"model": OPENAI_STT_MODEL}
            res = await client.post("/audio/transcriptions", files=files, data=data)
            res.raise_for_status()
            payload = res.json()

        text = payload.get("text")
        if not isinstance(text, str):
            raise RuntimeError("Unexpected STT response")
        logger.info("stt.completed", extra={"extra": {"chars": len(text)}})
        return text.strip()

