from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from openai import AsyncOpenAI

from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, *, redis: RedisClient | None = None):
        self._redis = redis

    async def embed(self, texts: list[str]) -> list[list[float]]:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for embeddings")

        cached: dict[int, list[float]] = {}
        missing: list[tuple[int, str]] = []

        for idx, text in enumerate(texts):
            text_norm = (text or "").strip()
            if not text_norm:
                cached[idx] = []
                continue

            key = self._cache_key(text_norm)
            if self._redis:
                raw = await self._redis.get(key)
                if raw:
                    try:
                        vec = json.loads(raw)
                        if isinstance(vec, list) and all(isinstance(v, (int, float)) for v in vec):
                            cached[idx] = [float(v) for v in vec]
                            continue
                    except Exception:
                        pass

            missing.append((idx, text_norm))

        if missing:
            client = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
            inputs = [t for _, t in missing]
            res = await client.embeddings.create(model=settings.openai_embedding_model, input=inputs)
            for (idx, text), item in zip(missing, res.data, strict=False):
                vec = list(item.embedding)
                cached[idx] = vec
                if self._redis:
                    await self._redis.set(self._cache_key(text), json.dumps(vec), ttl_s=7 * 24 * 3600)

        ordered: list[list[float]] = []
        for idx in range(len(texts)):
            ordered.append(cached.get(idx, []))

        logger.info("embeddings.generated", extra={"extra": {"count": len(texts), "missing": len(missing)}})
        return ordered

    def _cache_key(self, text: str) -> str:
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return f"emb:{h}"


def format_vector(vec: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"

