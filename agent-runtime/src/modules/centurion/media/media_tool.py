from __future__ import annotations

import logging
from typing import Any, Literal

from agno.tools.function import Function

from common.infrastructure.database.supabase_client import SupabaseDb

logger = logging.getLogger(__name__)

MediaType = Literal["audio", "image", "video", "document"]


def _coerce_tags(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        parts = [p.strip() for p in value.split(",")]
        return [p for p in parts if p][:32]
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            if isinstance(item, str) and item.strip():
                out.append(item.strip())
        return out[:32]
    return []


def _coerce_media_type(value: Any) -> MediaType | None:
    if value in ("audio", "image", "video", "document"):
        return value
    return None


class MediaTool:
    """
    Built-in tool to search/select media assets stored in `core.media_assets`.

    The tool returns metadata only (no signed URLs). The outbound sender (Evolution Manager)
    resolves `asset_id` to a signed URL before dispatching.
    """

    def __init__(self, *, db: SupabaseDb):
        self._db = db

    def as_function(self, *, company_id: str, centurion_id: str) -> Function:
        async def _search(
            q: str | None = None,
            tags: list[str] | str | None = None,
            media_type: MediaType | None = None,
            limit: int | None = None,
        ) -> dict[str, Any]:
            query = (q or "").strip()[:200]
            resolved_tags = _coerce_tags(tags)
            resolved_type = _coerce_media_type(media_type)
            try:
                parsed_limit = int(limit) if limit is not None else 5
            except (TypeError, ValueError):
                parsed_limit = 5
            resolved_limit = max(1, min(10, parsed_limit))

            where = [
                "company_id=$1::uuid",
                "is_active=true",
                "(centurion_id is null or centurion_id=$2::uuid)",
            ]
            args: list[Any] = [company_id, centurion_id]

            if query:
                where.append("(name ilike $3 or description ilike $3)")
                args.append(f"%{query}%")

            if resolved_type:
                where.append(f"media_type=${len(args) + 1}::core.media_asset_type")
                args.append(resolved_type)

            if resolved_tags:
                where.append(f"tags ?| ${len(args) + 1}::text[]")
                args.append(resolved_tags)

            sql = (
                "select id, company_id, centurion_id, name, description, media_type, mime_type, tags, file_size_bytes, created_at "
                "from core.media_assets "
                f"where {' and '.join(where)} "
                "order by created_at desc "
                f"limit ${len(args) + 1}"
            )
            args.append(resolved_limit)

            try:
                rows = await self._db.fetch(sql, *args)
            except Exception as err:
                logger.exception(
                    "media_tool.search_failed",
                    extra={
                        "extra": {
                            "company_id": company_id,
                            "centurion_id": centurion_id,
                            "query": query,
                            "tags": resolved_tags,
                            "media_type": resolved_type,
                        }
                    },
                )
                return {"assets": [], "error": str(err), "hint": "Try again with fewer filters."}
            assets = []
            for r in rows or []:
                assets.append(
                    {
                        "id": str(r["id"]),
                        "company_id": str(r["company_id"]),
                        "centurion_id": str(r["centurion_id"]) if r.get("centurion_id") else None,
                        "name": r.get("name"),
                        "description": r.get("description"),
                        "media_type": r.get("media_type"),
                        "mime_type": r.get("mime_type"),
                        "tags": list(r.get("tags") or []),
                        "file_size_bytes": int(r["file_size_bytes"]) if r.get("file_size_bytes") is not None else None,
                        "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
                    }
                )

            logger.info(
                "media_tool.search",
                extra={"extra": {"company_id": company_id, "centurion_id": centurion_id, "count": len(assets)}},
            )
            return {"assets": assets, "hint": "Use asset_id in outbound media messages (message.sent)."}

        return Function(
            name="media_search_assets",
            description=(
                "Search active media assets (audio/image/video/document) available for this Centurion and company. "
                "Returns metadata only (ids/tags)."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "q": {"type": "string", "description": "Search query (name/description)"},
                    "tags": {"type": ["array", "string"], "items": {"type": "string"}, "description": "Tags (array or CSV)"},
                    "media_type": {"type": "string", "enum": ["audio", "image", "video", "document"]},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 10},
                },
            },
            entrypoint=_search,
            show_result=False,
        )
