from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from openai import AsyncOpenAI

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.integrations.openai_resolver import OpenAIResolver

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, *, db: SupabaseDb | None = None, redis: RedisClient | None = None):
        self._redis = redis
        self._openai = OpenAIResolver(db) if db else None

    async def embed(self, *, company_id: str, texts: list[str]) -> list[list[float]]:
        if self._openai:
            resolved = await self._openai.resolve_optional(company_id=company_id)
            if not resolved:
                raise RuntimeError("OpenAI integration not configured for embeddings")
            api_key = resolved.api_key
            base_url = resolved.base_url
            model = resolved.embedding_model
        else:
            raise RuntimeError("SupabaseDb is required for embeddings (no env fallback)")

        cached: dict[int, list[float]] = {}
        missing: list[tuple[int, str]] = []

        for idx, text in enumerate(texts):
            text_norm = (text or "").strip()
            if not text_norm:
                cached[idx] = []
                continue

            key = self._cache_key(company_id=company_id, model=model, text=text_norm)
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
            client = AsyncOpenAI(api_key=api_key, base_url=base_url)
            inputs = [t for _, t in missing]
            res = await client.embeddings.create(model=model, input=inputs)
            for (idx, text), item in zip(missing, res.data, strict=False):
                vec = list(item.embedding)
                cached[idx] = vec
                if self._redis:
                    await self._redis.set(self._cache_key(company_id=company_id, model=model, text=text), json.dumps(vec), ttl_s=7 * 24 * 3600)

        ordered: list[list[float]] = []
        for idx in range(len(texts)):
            ordered.append(cached.get(idx, []))

        logger.info("embeddings.generated", extra={"extra": {"count": len(texts), "missing": len(missing)}})
        return ordered

    def _cache_key(self, *, company_id: str, model: str, text: str) -> str:
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return f"emb:{company_id}:{model}:{h}"


def format_vector(vec: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"
