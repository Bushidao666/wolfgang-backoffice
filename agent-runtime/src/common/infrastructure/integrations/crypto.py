from __future__ import annotations

import base64
import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


@dataclass(frozen=True)
class SecretKeyring:
    current: str
    previous: str | None = None


def load_keyring_from_env() -> SecretKeyring:
    current = (os.getenv("APP_ENCRYPTION_KEY_CURRENT") or os.getenv("APP_ENCRYPTION_KEY") or "").strip()
    previous = (os.getenv("APP_ENCRYPTION_KEY_PREVIOUS") or "").strip()
    if not current:
        raise RuntimeError("APP_ENCRYPTION_KEY_CURRENT (or APP_ENCRYPTION_KEY) is required")
    return SecretKeyring(current=current, previous=previous or None)


def _sha256_key(raw: str) -> bytes:
    return hashlib.sha256(raw.encode("utf-8")).digest()


def decrypt_v1(encrypted: str, *, keyring: SecretKeyring | None = None) -> str:
    value = (encrypted or "").strip()
    if not value.startswith("v1:"):
        return encrypted

    parts = value.split(":")
    if len(parts) != 4:
        raise ValueError("Invalid encrypted secret format")
    _, iv_b64, tag_b64, data_b64 = parts

    iv = base64.b64decode(iv_b64)
    tag = base64.b64decode(tag_b64)
    ciphertext = base64.b64decode(data_b64)
    payload = ciphertext + tag

    kr = keyring or load_keyring_from_env()

    def try_decrypt(raw_key: str) -> str:
        aesgcm = AESGCM(_sha256_key(raw_key))
        plaintext = aesgcm.decrypt(iv, payload, None)
        return plaintext.decode("utf-8")

    try:
        return try_decrypt(kr.current)
    except Exception:
        if not kr.previous:
            raise
        return try_decrypt(kr.previous)


def decrypt_json(encrypted: str, *, keyring: SecretKeyring | None = None) -> dict[str, Any]:
    raw = decrypt_v1(encrypted, keyring=keyring)
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return {}
    return {}

