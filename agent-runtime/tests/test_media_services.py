import types

import pytest

from modules.channels.services.media_downloader import MediaDownloader
from modules.channels.services.stt_service import SpeechToTextService
from modules.channels.services.vision_service import VisionService


class _FakeResponse:
    def __init__(self, *, status_code: int = 200, headers: dict[str, str] | None = None, content: bytes = b"", json_data=None):
        self.status_code = status_code
        self.headers = headers or {}
        self.content = content
        self._json_data = json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("http error")

    def json(self):
        return self._json_data


class _FakeAsyncClient:
    def __init__(self, *args, **kwargs):  # noqa: ARG002
        self.last_post: tuple[str, object] | None = None
        self.last_get: str | None = None
        self._response_get: _FakeResponse | None = None
        self._response_post: _FakeResponse | None = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):  # noqa: ARG002
        return False

    def with_get_response(self, resp: _FakeResponse):
        self._response_get = resp
        return self

    def with_post_response(self, resp: _FakeResponse):
        self._response_post = resp
        return self

    async def get(self, url: str):
        self.last_get = url
        assert self._response_get is not None
        return self._response_get

    async def post(self, url: str, **kwargs):
        self.last_post = (url, kwargs)
        assert self._response_post is not None
        return self._response_post


@pytest.mark.asyncio
async def test_media_downloader_downloads_bytes_and_content_type(monkeypatch):
    settings = types.SimpleNamespace(media_download_timeout_s=1.0)
    monkeypatch.setattr("modules.channels.services.media_downloader.get_settings", lambda: settings)

    fake = _FakeAsyncClient().with_get_response(_FakeResponse(headers={"content-type": "image/png"}, content=b"abc"))
    monkeypatch.setattr("modules.channels.services.media_downloader.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    downloader = MediaDownloader()
    data, ct = await downloader.download("http://example.test/x")
    assert data == b"abc"
    assert ct == "image/png"


@pytest.mark.asyncio
async def test_stt_requires_openai_key(monkeypatch):
    settings = types.SimpleNamespace(openai_api_key=None)
    monkeypatch.setattr("modules.channels.services.stt_service.get_settings", lambda: settings)

    svc = SpeechToTextService()
    with pytest.raises(RuntimeError):
        await svc.transcribe(audio_bytes=b"x")


@pytest.mark.asyncio
async def test_stt_transcribes_via_http(monkeypatch):
    settings = types.SimpleNamespace(openai_api_key="k")
    monkeypatch.setattr("modules.channels.services.stt_service.get_settings", lambda: settings)

    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={"text": " ok "}))
    monkeypatch.setattr("modules.channels.services.stt_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = SpeechToTextService()
    out = await svc.transcribe(audio_bytes=b"x", filename="a.ogg")
    assert out == "ok"


@pytest.mark.asyncio
async def test_vision_requires_openai_key(monkeypatch):
    settings = types.SimpleNamespace(openai_api_key=None)
    monkeypatch.setattr("modules.channels.services.vision_service.get_settings", lambda: settings)

    svc = VisionService()
    with pytest.raises(RuntimeError):
        await svc.describe(image_bytes=b"x")


@pytest.mark.asyncio
async def test_vision_describes_via_http(monkeypatch):
    settings = types.SimpleNamespace(openai_api_key="k")
    monkeypatch.setattr("modules.channels.services.vision_service.get_settings", lambda: settings)

    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={"choices": [{"message": {"content": " desc "}}]}))
    monkeypatch.setattr("modules.channels.services.vision_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = VisionService()
    out = await svc.describe(image_bytes=b"x", mime_type="image/png")
    assert out == "desc"

