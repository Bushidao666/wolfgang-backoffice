from __future__ import annotations

from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb


class ConfigRepository:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def get_centurion_config(self, *, company_id: str, centurion_id: str | None) -> dict[str, Any]:
        if centurion_id:
            row = await self._db.fetchrow(
                "select * from core.centurion_configs where id=$1 and company_id=$2 and is_active=true",
                centurion_id,
                company_id,
            )
            if row:
                return dict(row)

        row = await self._db.fetchrow(
            """
            select *
            from core.centurion_configs
            where company_id=$1 and is_active=true
            order by created_at asc
            limit 1
            """,
            company_id,
        )
        if not row:
            raise RuntimeError("No active centurion_config for company")
        return dict(row)

