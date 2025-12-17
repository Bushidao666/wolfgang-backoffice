from __future__ import annotations

from pydantic import BaseModel, HttpUrl


class MediaDto(BaseModel):
    type: str
    url: HttpUrl
    mime_type: str
    sha256: str | None = None

