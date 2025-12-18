import asyncio
import base64
import hashlib
import os
from typing import Any

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from common.infrastructure.integrations.resolver import CompanyIntegrationResolver


def _encrypt_v1(plaintext: str, *, key: str) -> str:
    iv = os.urandom(12)
    aesgcm = AESGCM(hashlib.sha256(key.encode("utf-8")).digest())
    out = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext, tag = out[:-16], out[-16:]

    return "v1:{iv}:{tag}:{data}".format(
        iv=base64.b64encode(iv).decode("ascii"),
        tag=base64.b64encode(tag).decode("ascii"),
        data=base64.b64encode(ciphertext).decode("ascii"),
    )


class _FakeDb:
    def __init__(
        self,
        responses: list[dict[str, Any] | None],
        *,
        start_event: asyncio.Event | None = None,
        block_event: asyncio.Event | None = None,
        block_on_call: int | None = None,
    ):
        self._responses = list(responses)
        self.calls: list[tuple[str, tuple[object, ...]]] = []
        self._start_event = start_event
        self._block_event = block_event
        self._block_on_call = block_on_call

    async def fetchrow(self, query: str, *args):  # type: ignore[no-untyped-def]
        self.calls.append((query, args))
        call_index = len(self.calls)

        if self._start_event and call_index == 1:
            self._start_event.set()

        if self._block_event and self._block_on_call == call_index:
            await self._block_event.wait()

        if not self._responses:
            raise AssertionError("No more fake DB responses configured")

        return self._responses.pop(0)


@pytest.mark.asyncio
async def test_resolve_returns_default_set_when_no_binding(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    secrets_enc = _encrypt_v1('{"api_key":"db"}', key="k1")

    db = _FakeDb(
        [
            None,
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "provider": "openai",
                "config": {"base_url": "https://db.example"},
                "secrets_enc": secrets_enc,
            },
        ]
    )
    resolver = CompanyIntegrationResolver(db)  # type: ignore[arg-type]

    resolved = await resolver.resolve(company_id="c1", provider="openai")
    assert resolved is not None
    assert resolved.source == "global"
    assert resolved.credential_set_id == "11111111-1111-1111-1111-111111111111"
    assert resolved.config["base_url"] == "https://db.example"
    assert resolved.secrets["api_key"] == "db"


@pytest.mark.asyncio
async def test_resolve_returns_none_when_disabled(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    db = _FakeDb(
        [
            {
                "mode": "disabled",
                "credential_set_id": None,
                "config_override": {},
                "secrets_override_enc": "",
            }
        ]
    )
    resolver = CompanyIntegrationResolver(db)  # type: ignore[arg-type]
    assert await resolver.resolve(company_id="c1", provider="openai") is None


@pytest.mark.asyncio
async def test_resolve_returns_custom_override(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    override_enc = _encrypt_v1('{"api_key":"custom"}', key="k1")
    db = _FakeDb(
        [
            {
                "mode": "custom",
                "credential_set_id": None,
                "config_override": {"chat_model": "gpt-custom"},
                "secrets_override_enc": override_enc,
            }
        ]
    )
    resolver = CompanyIntegrationResolver(db)  # type: ignore[arg-type]

    resolved = await resolver.resolve(company_id="c1", provider="openai")
    assert resolved is not None
    assert resolved.source == "custom"
    assert resolved.credential_set_id is None
    assert resolved.config["chat_model"] == "gpt-custom"
    assert resolved.secrets["api_key"] == "custom"


@pytest.mark.asyncio
async def test_resolve_global_uses_specific_set_id(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    secrets_enc = _encrypt_v1('{"api_key":"set"}', key="k1")

    db = _FakeDb(
        [
            {
                "mode": "global",
                "credential_set_id": "22222222-2222-2222-2222-222222222222",
                "config_override": {},
                "secrets_override_enc": "",
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "provider": "openai",
                "config": {"chat_model": "gpt-set"},
                "secrets_enc": secrets_enc,
            },
        ]
    )
    resolver = CompanyIntegrationResolver(db)  # type: ignore[arg-type]

    resolved = await resolver.resolve(company_id="c1", provider="openai")
    assert resolved is not None
    assert resolved.source == "global"
    assert resolved.credential_set_id == "22222222-2222-2222-2222-222222222222"
    assert resolved.config["chat_model"] == "gpt-set"
    assert resolved.secrets["api_key"] == "set"


@pytest.mark.asyncio
async def test_resolve_uses_cache_without_extra_db_calls(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    secrets_enc = _encrypt_v1('{"api_key":"cached"}', key="k1")

    db = _FakeDb(
        [
            None,
            {
                "id": "33333333-3333-3333-3333-333333333333",
                "provider": "openai",
                "config": {},
                "secrets_enc": secrets_enc,
            },
        ]
    )
    resolver = CompanyIntegrationResolver(db, cache_ttl_s=60.0)  # type: ignore[arg-type]

    first = await resolver.resolve(company_id="c1", provider="openai")
    second = await resolver.resolve(company_id="c1", provider="openai")

    assert first == second
    assert len(db.calls) == 2


@pytest.mark.asyncio
async def test_cache_hit_inside_lock(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    secrets_enc = _encrypt_v1('{"api_key":"cached"}', key="k1")

    started = asyncio.Event()
    release = asyncio.Event()
    db = _FakeDb(
        [
            None,
            {
                "id": "44444444-4444-4444-4444-444444444444",
                "provider": "openai",
                "config": {},
                "secrets_enc": secrets_enc,
            },
        ],
        start_event=started,
        block_event=release,
        block_on_call=1,
    )
    resolver = CompanyIntegrationResolver(db, cache_ttl_s=60.0)  # type: ignore[arg-type]

    task1 = asyncio.create_task(resolver.resolve(company_id="c1", provider="openai"))
    await started.wait()
    task2 = asyncio.create_task(resolver.resolve(company_id="c1", provider="openai"))

    await asyncio.sleep(0)
    release.set()

    r1, r2 = await asyncio.gather(task1, task2)
    assert r1 == r2
    assert len(db.calls) == 2


@pytest.mark.asyncio
async def test_missing_default_set_raises(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    db = _FakeDb([None, None])
    resolver = CompanyIntegrationResolver(db)  # type: ignore[arg-type]
    with pytest.raises(RuntimeError, match="Missing default credential set"):
        await resolver.resolve(company_id="c1", provider="openai")


@pytest.mark.asyncio
async def test_missing_set_id_raises(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    db = _FakeDb(
        [
            {
                "mode": "global",
                "credential_set_id": "55555555-5555-5555-5555-555555555555",
                "config_override": {},
                "secrets_override_enc": "",
            },
            None,
        ]
    )
    resolver = CompanyIntegrationResolver(db)  # type: ignore[arg-type]

    with pytest.raises(RuntimeError, match="Credential set not found"):
        await resolver.resolve(company_id="c1", provider="openai")

