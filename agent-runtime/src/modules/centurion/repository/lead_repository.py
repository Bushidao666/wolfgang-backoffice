from __future__ import annotations

from datetime import datetime
from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb
from modules.centurion.domain.lead import Lead


class LeadRepository:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def get_or_create(self, *, company_id: str, phone: str) -> tuple[Lead, bool]:
        row = await self._db.fetchrow(
            "select * from core.leads where company_id=$1 and phone=$2",
            company_id,
            phone,
        )
        if row:
            return self._map(row), False

        pixel = await self._db.fetchrow(
            """
            select id
            from core.pixel_configs
            where company_id=$1 and is_active=true
            order by created_at desc
            limit 1
            """,
            company_id,
        )
        pixel_config_id = str(pixel["id"]) if pixel and pixel.get("id") else None

        row = await self._db.fetchrow(
            """
            insert into core.leads (company_id, phone, pixel_config_id, first_contact_at, last_contact_at)
            values ($1, $2, $3, now(), now())
            returning *
            """,
            company_id,
            phone,
            pixel_config_id,
        )
        return self._map(row), True

    async def update_qualification(
        self,
        *,
        lead_id: str,
        company_id: str,
        score: float,
        data: dict[str, Any],
        qualified_at: datetime | None,
    ) -> Lead:
        row = await self._db.fetchrow(
            """
            update core.leads
            set
              is_qualified = $3,
              qualification_score = $4,
              qualification_data = coalesce(qualification_data, '{}'::jsonb) || $5::jsonb,
              qualified_at = $6,
              lifecycle_stage = case when $3 then 'qualified' else lifecycle_stage end,
              updated_at = now()
            where id=$1 and company_id=$2
            returning *
            """,
            lead_id,
            company_id,
            qualified_at is not None,
            score,
            data,
            qualified_at,
        )
        if not row:
            raise RuntimeError("Lead not found for qualification update")
        return self._map(row)

    async def touch_inbound(self, *, company_id: str, lead_id: str) -> None:
        await self._db.execute(
            """
            update core.leads
            set
              last_contact_at=now(),
              first_contact_at=coalesce(first_contact_at, now()),
              lifecycle_stage = case
                when lifecycle_stage in ('follow_up_pending', 'follow_up_sent', 'proactive_contacted') then 'proactive_replied'
                else 'contacted'
              end,
              updated_at=now()
            where id=$1 and company_id=$2 and lifecycle_stage not in ('qualified', 'handoff_done', 'closed_lost')
            """,
            lead_id,
            company_id,
        )

    async def touch_outbound(self, *, company_id: str, lead_id: str) -> None:
        await self._db.execute(
            """
            update core.leads
            set
              last_contact_at=now(),
              first_contact_at=coalesce(first_contact_at, now()),
              lifecycle_stage = case
                when lifecycle_stage='new' then 'proactive_contacted'
                else lifecycle_stage
              end,
              updated_at=now()
            where id=$1 and company_id=$2 and lifecycle_stage not in ('qualified', 'handoff_done', 'closed_lost')
            """,
            lead_id,
            company_id,
        )

    def _map(self, row: Any) -> Lead:
        return Lead(
            id=str(row["id"]),
            company_id=str(row["company_id"]),
            phone=row["phone"],
            name=row.get("name"),
            lifecycle_stage=row.get("lifecycle_stage") or "new",
            is_qualified=bool(row.get("is_qualified") or False),
            qualification_score=float(row["qualification_score"]) if row.get("qualification_score") is not None else None,
            qualification_data=dict(row.get("qualification_data") or {}),
            centurion_id=str(row["centurion_id"]) if row.get("centurion_id") else None,
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
