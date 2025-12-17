from __future__ import annotations

import logging

import httpx

from common.config.settings import get_settings

logger = logging.getLogger(__name__)


class MediaDownloader:
    async def download(self, url: str) -> tuple[bytes, str]:
        settings = get_settings()
        timeout = httpx.Timeout(settings.media_download_timeout_s)

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            res = await client.get(url)
            res.raise_for_status()
            content_type = res.headers.get("content-type") or "application/octet-stream"
            data = res.content

        logger.info("media.downloaded", extra={"extra": {"bytes": len(data), "content_type": content_type}})
        return data, content_type

