from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Literal

from common.infrastructure.database.supabase_client import SupabaseDb

from .crypto import SecretKeyring, decrypt_json, load_keyring_from_env

IntegrationProvider = Literal["autentique", "evolution", "openai"]
IntegrationMode = Literal["global", "custom", "disabled"]


@dataclass(frozen=True)
class ResolvedIntegration:
    provider: IntegrationProvider
    source: Literal["global", "custom"]
    credential_set_id: str | None
    config: dict[str, Any]
    secrets: dict[str, Any]


class CompanyIntegrationResolver:
    def __init__(self, db: SupabaseDb, *, cache_ttl_s: float = 30.0):
        self._db = db
        self._cache_ttl_s = cache_ttl_s
        self._cache: dict[tuple[str, str], tuple[float, ResolvedIntegration | None]] = {}
        self._locks: dict[tuple[str, str], asyncio.Lock] = {}
        self._keyring: SecretKeyring | None = None

    def _get_keyring(self) -> SecretKeyring:
        if not self._keyring:
            self._keyring = load_keyring_from_env()
        return self._keyring

    def _lock_for(self, company_id: str, provider: IntegrationProvider) -> asyncio.Lock:
        key = (company_id, provider)
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    async def resolve(self, *, company_id: str, provider: IntegrationProvider) -> ResolvedIntegration | None:
        cache_key = (company_id, provider)
        now = time.monotonic()
        cached = self._cache.get(cache_key)
        if cached and cached[0] > now:
            return cached[1]

        lock = self._lock_for(company_id, provider)
        async with lock:
            cached = self._cache.get(cache_key)
            if cached and cached[0] > time.monotonic():
                return cached[1]

            value = await self._resolve_uncached(company_id=company_id, provider=provider)
            self._cache[cache_key] = (time.monotonic() + self._cache_ttl_s, value)
            return value

    async def _resolve_uncached(self, *, company_id: str, provider: IntegrationProvider) -> ResolvedIntegration | None:
        row = await self._db.fetchrow(
            """
            select
              mode,
              credential_set_id,
              config_override,
              secrets_override_enc
            from core.company_integration_bindings
            where company_id=$1
              and provider=$2::core.integration_provider
            limit 1
            """,
            company_id,
            provider,
        )

        if not row:
            default_set = await self._load_default_set(provider=provider)
            return ResolvedIntegration(
                provider=provider,
                source="global",
                credential_set_id=str(default_set["id"]),
                config=dict(default_set.get("config") or {}),
                secrets=decrypt_json(str(default_set.get("secrets_enc") or ""), keyring=self._get_keyring()),
            )

        mode: str = str(row.get("mode") or "")
        if mode == "disabled":
            return None

        if mode == "custom":
            return ResolvedIntegration(
                provider=provider,
                source="custom",
                credential_set_id=None,
                config=dict(row.get("config_override") or {}),
                secrets=decrypt_json(str(row.get("secrets_override_enc") or ""), keyring=self._get_keyring()),
            )

        # mode=global
        set_id = row.get("credential_set_id") or None
        set_row = await self._load_set_by_id(str(set_id)) if set_id else await self._load_default_set(provider=provider)
        return ResolvedIntegration(
            provider=provider,
            source="global",
            credential_set_id=str(set_row["id"]),
            config=dict(set_row.get("config") or {}),
            secrets=decrypt_json(str(set_row.get("secrets_enc") or ""), keyring=self._get_keyring()),
        )

    async def _load_default_set(self, *, provider: IntegrationProvider):
        row = await self._db.fetchrow(
            """
            select id, provider, config, secrets_enc
            from core.integration_credential_sets
            where provider=$1::core.integration_provider
              and is_default=true
            limit 1
            """,
            provider,
        )
        if not row:
            raise RuntimeError(f"Missing default credential set for provider={provider}")
        return row

    async def _load_set_by_id(self, set_id: str):
        row = await self._db.fetchrow(
            """
            select id, provider, config, secrets_enc
            from core.integration_credential_sets
            where id=$1::uuid
            limit 1
            """,
            set_id,
        )
        if not row:
            raise RuntimeError(f"Credential set not found: {set_id}")
        return row

