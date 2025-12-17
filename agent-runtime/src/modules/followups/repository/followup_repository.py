from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb
from modules.followups.domain.followup_rule import FollowupRule


@dataclass(frozen=True)
class FollowupQueueItem:
    id: str
    company_id: str
    lead_id: str
    centurion_id: str
    rule_id: str | None
    scheduled_at: datetime
    attempt_number: int
    status: str


class FollowupRepository:
    def __init__(self, db: SupabaseDb):
        self._db = db

    async def list_active_rules(self, *, company_id: str, centurion_id: str) -> list[FollowupRule]:
        rows = await self._db.fetch(
            """
            select *
            from core.followup_rules
            where company_id=$1
              and centurion_id=$2
              and is_active=true
            order by inactivity_hours asc
            """,
            company_id,
            centurion_id,
        )
        rules: list[FollowupRule] = []
        for r in rows:
            rules.append(
                FollowupRule(
                    id=str(r["id"]),
                    company_id=str(r["company_id"]),
                    centurion_id=str(r["centurion_id"]),
                    name=str(r["name"]),
                    inactivity_hours=int(r.get("inactivity_hours") or 24),
                    template=str(r.get("template") or ""),
                    max_attempts=int(r.get("max_attempts") or 1),
                    is_active=bool(r.get("is_active") if r.get("is_active") is not None else True),
                )
            )
        return rules

    async def cancel_pending_for_lead(self, *, company_id: str, lead_id: str) -> int:
        res = await self._db.execute(
            """
            update core.followup_queue
            set status='canceled', updated_at=now()
            where company_id=$1
              and lead_id=$2
              and status in ('pending')
            """,
            company_id,
            lead_id,
        )
        # res: "UPDATE <n>"
        try:
            return int(res.split()[-1])
        except Exception:
            return 0

    async def count_sent_attempts(self, *, company_id: str, lead_id: str, rule_id: str) -> int:
        row = await self._db.fetchrow(
            """
            select count(*) as cnt
            from core.followup_queue
            where company_id=$1 and lead_id=$2 and rule_id=$3 and status='sent'
            """,
            company_id,
            lead_id,
            rule_id,
        )
        return int(row["cnt"] if row else 0)

    async def has_future_pending(self, *, company_id: str, lead_id: str, rule_id: str) -> bool:
        row = await self._db.fetchrow(
            """
            select 1
            from core.followup_queue
            where company_id=$1
              and lead_id=$2
              and rule_id=$3
              and status in ('pending', 'processing')
              and scheduled_at >= now()
            limit 1
            """,
            company_id,
            lead_id,
            rule_id,
        )
        return row is not None

    async def schedule(
        self,
        *,
        company_id: str,
        lead_id: str,
        centurion_id: str,
        rule_id: str,
        scheduled_at: datetime,
        attempt_number: int,
    ) -> str:
        row = await self._db.fetchrow(
            """
            insert into core.followup_queue (company_id, lead_id, centurion_id, rule_id, scheduled_at, attempt_number, status)
            values ($1, $2, $3, $4, $5, $6, 'pending')
            returning id
            """,
            company_id,
            lead_id,
            centurion_id,
            rule_id,
            scheduled_at,
            attempt_number,
        )
        return str(row["id"]) if row else ""

    async def claim_due(self, *, limit: int = 20) -> list[FollowupQueueItem]:
        async with self._db.transaction() as conn:
            rows = await conn.fetch(
                """
                with cte as (
                  select id
                  from core.followup_queue
                  where status='pending'
                    and scheduled_at <= now()
                  order by scheduled_at asc
                  limit $1
                  for update skip locked
                )
                update core.followup_queue q
                set status='processing', updated_at=now()
                from cte
                where q.id=cte.id
                returning q.*
                """,
                limit,
            )

        items: list[FollowupQueueItem] = []
        for r in rows:
            items.append(
                FollowupQueueItem(
                    id=str(r["id"]),
                    company_id=str(r["company_id"]),
                    lead_id=str(r["lead_id"]),
                    centurion_id=str(r["centurion_id"]),
                    rule_id=str(r["rule_id"]) if r.get("rule_id") else None,
                    scheduled_at=r["scheduled_at"],
                    attempt_number=int(r.get("attempt_number") or 1),
                    status=str(r.get("status") or "processing"),
                )
            )
        return items

    async def mark_sent(self, *, queue_id: str, message_id: str | None) -> None:
        await self._db.execute(
            """
            update core.followup_queue
            set status='sent',
                sent_at=now(),
                message_id=$2,
                updated_at=now(),
                last_error=null
            where id=$1
            """,
            queue_id,
            message_id,
        )

    async def mark_failed(self, *, queue_id: str, error: str) -> None:
        await self._db.execute(
            """
            update core.followup_queue
            set status='failed',
                last_error=$2,
                updated_at=now()
            where id=$1
            """,
            queue_id,
            error,
        )

    async def get_rule_by_id(self, *, rule_id: str) -> FollowupRule | None:
        row = await self._db.fetchrow("select * from core.followup_rules where id=$1", rule_id)
        if not row:
            return None
        return FollowupRule(
            id=str(row["id"]),
            company_id=str(row["company_id"]),
            centurion_id=str(row["centurion_id"]),
            name=str(row["name"]),
            inactivity_hours=int(row.get("inactivity_hours") or 24),
            template=str(row.get("template") or ""),
            max_attempts=int(row.get("max_attempts") or 1),
            is_active=bool(row.get("is_active") if row.get("is_active") is not None else True),
        )

