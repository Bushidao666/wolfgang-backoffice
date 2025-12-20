from __future__ import annotations

import logging

import httpx

from common.config.settings import get_settings
from common.security.egress_policy import EgressPolicy
from common.security.payload_limits import PayloadLimits

logger = logging.getLogger(__name__)


class MediaDownloader:
    def __init__(self, *, egress_policy: EgressPolicy | None = None, limits: PayloadLimits | None = None):
        self._egress = egress_policy or EgressPolicy.from_env()
        self._limits = limits or PayloadLimits.from_env()

    async def download(self, url: str) -> tuple[bytes, str]:
        settings = get_settings()
        timeout = httpx.Timeout(settings.media_download_timeout_s)
        max_bytes = int(self._limits.media_download_max_bytes)

        current = url
        max_redirects = 5

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            for _ in range(max_redirects + 1):
                await self._egress.assert_url_allowed(current)

                async with client.stream("GET", current) as res:
                    if res.status_code in (301, 302, 303, 307, 308):
                        location = res.headers.get("location")
                        if not location:
                            raise RuntimeError("Redirect without Location header")
                        current = str(httpx.URL(current).join(location))
                        continue

                    res.raise_for_status()

                    content_length = res.headers.get("content-length")
                    if content_length:
                        try:
                            cl = int(content_length)
                        except Exception:
                            cl = None
                        if cl is not None and cl > max_bytes:
                            raise ValueError(f"Media download too large ({cl} bytes > {max_bytes})")

                    content_type = res.headers.get("content-type") or "application/octet-stream"
                    data = bytearray()
                    async for chunk in res.aiter_bytes():
                        if not chunk:
                            continue
                        data.extend(chunk)
                        if len(data) > max_bytes:
                            raise ValueError(f"Media download exceeded limit ({len(data)} bytes > {max_bytes})")

                    final = bytes(data)
                    logger.info(
                        "media.downloaded",
                        extra={"extra": {"bytes": len(final), "content_type": content_type}},
                    )
                    return final, content_type

        raise RuntimeError("Too many redirects while downloading media")
