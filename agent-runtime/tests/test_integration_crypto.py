import base64
import hashlib
import os

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from common.infrastructure.integrations.crypto import decrypt_json, decrypt_v1


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


def test_decrypt_v1_returns_plaintext_when_not_encrypted(monkeypatch):
    monkeypatch.delenv("APP_ENCRYPTION_KEY_CURRENT", raising=False)
    monkeypatch.delenv("APP_ENCRYPTION_KEY", raising=False)
    monkeypatch.delenv("APP_ENCRYPTION_KEY_PREVIOUS", raising=False)
    assert decrypt_v1("plain") == "plain"


def test_decrypt_v1_decrypts_with_current_key(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    enc = _encrypt_v1("hello", key="k1")
    assert decrypt_v1(enc) == "hello"


def test_decrypt_v1_uses_previous_key_when_rotated(monkeypatch):
    enc = _encrypt_v1("secret", key="old")
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "new")
    monkeypatch.setenv("APP_ENCRYPTION_KEY_PREVIOUS", "old")
    assert decrypt_v1(enc) == "secret"


def test_decrypt_json_round_trip(monkeypatch):
    monkeypatch.setenv("APP_ENCRYPTION_KEY_CURRENT", "k1")
    enc = _encrypt_v1('{"a":1,"b":"x"}', key="k1")
    assert decrypt_json(enc) == {"a": 1, "b": "x"}

