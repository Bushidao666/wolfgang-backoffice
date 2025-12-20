import types

import pytest

from common.security.egress_policy import EgressPolicy
from common.security.payload_limits import PayloadLimits
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

    async def aiter_bytes(self):
        yield self.content


class _FakeStream:
    def __init__(self, response: _FakeResponse):
        self._response = response

    async def __aenter__(self):
        return self._response

    async def __aexit__(self, exc_type, exc, tb):  # noqa: ARG002
        return False


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

    def stream(self, method: str, url: str, **kwargs):  # noqa: ARG002
        assert method in ("GET", "get", "Get")
        self.last_get = url
        assert self._response_get is not None
        return _FakeStream(self._response_get)

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

    downloader = MediaDownloader(egress_policy=EgressPolicy(block_private_networks=False), limits=PayloadLimits(media_download_max_bytes=10))
    data, ct = await downloader.download("http://example.test/x")
    assert data == b"abc"
    assert ct == "image/png"


@pytest.mark.asyncio
async def test_media_downloader_enforces_max_bytes(monkeypatch):
    settings = types.SimpleNamespace(media_download_timeout_s=1.0)
    monkeypatch.setattr("modules.channels.services.media_downloader.get_settings", lambda: settings)

    fake = _FakeAsyncClient().with_get_response(_FakeResponse(headers={"content-type": "image/png"}, content=b"abc"))
    monkeypatch.setattr("modules.channels.services.media_downloader.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    downloader = MediaDownloader(
        egress_policy=EgressPolicy(block_private_networks=False),
        limits=PayloadLimits(media_download_max_bytes=2),
    )

    with pytest.raises(ValueError):
        await downloader.download("http://example.test/x")


@pytest.mark.asyncio
async def test_media_downloader_follows_redirects(monkeypatch):
    settings = types.SimpleNamespace(media_download_timeout_s=1.0)
    monkeypatch.setattr("modules.channels.services.media_downloader.get_settings", lambda: settings)

    redirect = _FakeResponse(status_code=302, headers={"location": "/final"})
    final = _FakeResponse(status_code=200, headers={"content-type": "image/png"}, content=b"ok")

    class _RedirectClient(_FakeAsyncClient):
        def __init__(self):  # noqa: D401
            super().__init__()
            self.calls: list[str] = []

        def stream(self, method: str, url: str, **kwargs):  # noqa: ARG002
            self.calls.append(url)
            if url.endswith("/x"):
                return _FakeStream(redirect)
            return _FakeStream(final)

    fake = _RedirectClient()
    monkeypatch.setattr("modules.channels.services.media_downloader.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    downloader = MediaDownloader(egress_policy=EgressPolicy(block_private_networks=False))
    data, ct = await downloader.download("http://example.test/x")
    assert data == b"ok"
    assert ct == "image/png"
    assert fake.calls == ["http://example.test/x", "http://example.test/final"]


@pytest.mark.asyncio
async def test_media_downloader_rejects_redirect_without_location(monkeypatch):
    settings = types.SimpleNamespace(media_download_timeout_s=1.0)
    monkeypatch.setattr("modules.channels.services.media_downloader.get_settings", lambda: settings)

    redirect = _FakeResponse(status_code=302, headers={})

    class _Client(_FakeAsyncClient):
        def stream(self, method: str, url: str, **kwargs):  # noqa: ARG002
            return _FakeStream(redirect)

    fake = _Client()
    monkeypatch.setattr("modules.channels.services.media_downloader.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    downloader = MediaDownloader(egress_policy=EgressPolicy(block_private_networks=False))
    with pytest.raises(RuntimeError):
        await downloader.download("http://example.test/x")


@pytest.mark.asyncio
async def test_media_downloader_respects_content_length_header(monkeypatch):
    settings = types.SimpleNamespace(media_download_timeout_s=1.0)
    monkeypatch.setattr("modules.channels.services.media_downloader.get_settings", lambda: settings)

    fake = _FakeAsyncClient().with_get_response(
        _FakeResponse(headers={"content-type": "image/png", "content-length": "3"}, content=b"abc")
    )
    monkeypatch.setattr("modules.channels.services.media_downloader.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    downloader = MediaDownloader(
        egress_policy=EgressPolicy(block_private_networks=False),
        limits=PayloadLimits(media_download_max_bytes=2),
    )
    with pytest.raises(ValueError):
        await downloader.download("http://example.test/x")


@pytest.mark.asyncio
async def test_media_downloader_skips_empty_chunks(monkeypatch):
    settings = types.SimpleNamespace(media_download_timeout_s=1.0)
    monkeypatch.setattr("modules.channels.services.media_downloader.get_settings", lambda: settings)

    class _ChunkyResponse(_FakeResponse):
        async def aiter_bytes(self):
            yield b""
            yield b"ok"

    fake = _FakeAsyncClient().with_get_response(_ChunkyResponse(headers={"content-type": "image/png"}))
    monkeypatch.setattr("modules.channels.services.media_downloader.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    downloader = MediaDownloader(egress_policy=EgressPolicy(block_private_networks=False))
    data, ct = await downloader.download("http://example.test/x")
    assert data == b"ok"
    assert ct == "image/png"


@pytest.mark.asyncio
async def test_media_downloader_errors_on_too_many_redirects(monkeypatch):
    settings = types.SimpleNamespace(media_download_timeout_s=1.0)
    monkeypatch.setattr("modules.channels.services.media_downloader.get_settings", lambda: settings)

    redirect = _FakeResponse(status_code=302, headers={"location": "/x"})

    class _Client(_FakeAsyncClient):
        def stream(self, method: str, url: str, **kwargs):  # noqa: ARG002
            return _FakeStream(redirect)

    fake = _Client()
    monkeypatch.setattr("modules.channels.services.media_downloader.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    downloader = MediaDownloader(egress_policy=EgressPolicy(block_private_networks=False))
    with pytest.raises(RuntimeError, match="Too many redirects"):
        await downloader.download("http://example.test/x")


@pytest.mark.asyncio
async def test_stt_requires_openai_integration(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return None

    monkeypatch.setattr("modules.channels.services.stt_service.OpenAIResolver", _FakeOpenAIResolver)

    svc = SpeechToTextService(db=object())  # type: ignore[arg-type]
    with pytest.raises(RuntimeError):
        await svc.transcribe(company_id="c1", audio_bytes=b"x")


@pytest.mark.asyncio
async def test_stt_transcribes_via_http(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return types.SimpleNamespace(api_key="k", base_url="https://example.test", stt_model="whisper-1")

    monkeypatch.setattr("modules.channels.services.stt_service.OpenAIResolver", _FakeOpenAIResolver)

    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={"text": " ok "}))
    monkeypatch.setattr("modules.channels.services.stt_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = SpeechToTextService(db=object(), egress_policy=EgressPolicy(block_private_networks=False))  # type: ignore[arg-type]
    out = await svc.transcribe(company_id="c1", audio_bytes=b"x", filename="a.ogg")
    assert out == "ok"


@pytest.mark.asyncio
async def test_stt_requires_db():
    svc = SpeechToTextService()
    with pytest.raises(RuntimeError):
        await svc.transcribe(company_id="c1", audio_bytes=b"x")


@pytest.mark.asyncio
async def test_stt_raises_on_unexpected_response(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return types.SimpleNamespace(api_key="k", base_url="https://example.test", stt_model="whisper-1")

    monkeypatch.setattr("modules.channels.services.stt_service.OpenAIResolver", _FakeOpenAIResolver)

    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={"text": None}))
    monkeypatch.setattr("modules.channels.services.stt_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = SpeechToTextService(db=object(), egress_policy=EgressPolicy(block_private_networks=False))  # type: ignore[arg-type]
    with pytest.raises(RuntimeError):
        await svc.transcribe(company_id="c1", audio_bytes=b"x")


@pytest.mark.asyncio
async def test_stt_truncates_large_transcriptions(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return types.SimpleNamespace(api_key="k", base_url="https://example.test", stt_model="whisper-1")

    monkeypatch.setattr("modules.channels.services.stt_service.OpenAIResolver", _FakeOpenAIResolver)

    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={"text": "x" * 9000}))
    monkeypatch.setattr("modules.channels.services.stt_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = SpeechToTextService(db=object(), egress_policy=EgressPolicy(block_private_networks=False))  # type: ignore[arg-type]
    out = await svc.transcribe(company_id="c1", audio_bytes=b"x")
    assert len(out) == 8000


@pytest.mark.asyncio
async def test_stt_rejects_large_audio_payload():
    svc = SpeechToTextService(
        db=object(),  # type: ignore[arg-type]
        egress_policy=EgressPolicy(block_private_networks=False),
        limits=PayloadLimits(stt_audio_max_bytes=1),
    )
    with pytest.raises(ValueError):
        await svc.transcribe(company_id="c1", audio_bytes=b"ab")


@pytest.mark.asyncio
async def test_vision_requires_openai_integration(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return None

    monkeypatch.setattr("modules.channels.services.vision_service.OpenAIResolver", _FakeOpenAIResolver)

    svc = VisionService(db=object())  # type: ignore[arg-type]
    with pytest.raises(RuntimeError):
        await svc.describe(company_id="c1", image_bytes=b"x")


@pytest.mark.asyncio
async def test_vision_describes_via_http(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return types.SimpleNamespace(api_key="k", base_url="https://example.test", vision_model="gpt-4o-mini")

    monkeypatch.setattr("modules.channels.services.vision_service.OpenAIResolver", _FakeOpenAIResolver)

    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={"choices": [{"message": {"content": " desc "}}]}))
    monkeypatch.setattr("modules.channels.services.vision_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = VisionService(db=object(), egress_policy=EgressPolicy(block_private_networks=False))  # type: ignore[arg-type]
    out = await svc.describe(company_id="c1", image_bytes=b"x", mime_type="image/png")
    assert out == "desc"


@pytest.mark.asyncio
async def test_vision_rejects_large_image_payload():
    svc = VisionService(
        db=object(),  # type: ignore[arg-type]
        egress_policy=EgressPolicy(block_private_networks=False),
        limits=PayloadLimits(vision_image_max_bytes=1),
    )
    with pytest.raises(ValueError):
        await svc.describe(company_id="c1", image_bytes=b"ab")


@pytest.mark.asyncio
async def test_vision_requires_db():
    svc = VisionService()
    with pytest.raises(RuntimeError):
        await svc.describe(company_id="c1", image_bytes=b"x")


@pytest.mark.asyncio
async def test_vision_raises_on_unexpected_response(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return types.SimpleNamespace(api_key="k", base_url="https://example.test", vision_model="gpt-4o-mini")

    monkeypatch.setattr("modules.channels.services.vision_service.OpenAIResolver", _FakeOpenAIResolver)

    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={}))
    monkeypatch.setattr("modules.channels.services.vision_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = VisionService(db=object(), egress_policy=EgressPolicy(block_private_networks=False))  # type: ignore[arg-type]
    with pytest.raises(RuntimeError):
        await svc.describe(company_id="c1", image_bytes=b"x")


@pytest.mark.asyncio
async def test_vision_truncates_large_descriptions(monkeypatch):
    class _FakeOpenAIResolver:
        def __init__(self, *args, **kwargs):  # noqa: ARG002
            pass

        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return types.SimpleNamespace(api_key="k", base_url="https://example.test", vision_model="gpt-4o-mini")

    monkeypatch.setattr("modules.channels.services.vision_service.OpenAIResolver", _FakeOpenAIResolver)

    long = "x" * 9000
    fake = _FakeAsyncClient().with_post_response(_FakeResponse(json_data={"choices": [{"message": {"content": long}}]}))
    monkeypatch.setattr("modules.channels.services.vision_service.httpx.AsyncClient", lambda *a, **k: fake)  # noqa: ARG005

    svc = VisionService(db=object(), egress_policy=EgressPolicy(block_private_networks=False))  # type: ignore[arg-type]
    out = await svc.describe(company_id="c1", image_bytes=b"x")
    assert len(out) == 8000
