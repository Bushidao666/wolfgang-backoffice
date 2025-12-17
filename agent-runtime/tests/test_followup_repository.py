from __future__ import annotations

from datetime import datetime, timezone

import pytest

from modules.followups.repository.followup_repository import FollowupRepository


class _Db:
    def __init__(self):
        self.execute_result = "UPDATE 0"
        self.fetchrow_result = None
        self.fetch_result = []
        self.executed: list[tuple[str, tuple[object, ...]]] = []
        self.fetchrow_calls: list[tuple[str, tuple[object, ...]]] = []

    async def execute(self, query: str, *args):
        self.executed.append((query, args))
        return self.execute_result

    async def fetchrow(self, query: str, *args):
        self.fetchrow_calls.append((query, args))
        return self.fetchrow_result

    async def fetch(self, query: str, *args):  # noqa: ARG002
        return list(self.fetch_result)


@pytest.mark.asyncio
async def test_cancel_pending_parses_update_count():
    db = _Db()
    db.execute_result = "UPDATE 3"
    repo = FollowupRepository(db)  # type: ignore[arg-type]
    assert await repo.cancel_pending_for_lead(company_id="co1", lead_id="l1") == 3

    db.execute_result = "bad"
    assert await repo.cancel_pending_for_lead(company_id="co1", lead_id="l1") == 0


@pytest.mark.asyncio
async def test_schedule_returns_queue_id():
    db = _Db()
    db.fetchrow_result = {"id": "q1"}
    repo = FollowupRepository(db)  # type: ignore[arg-type]
    out = await repo.schedule(
        company_id="co1",
        lead_id="l1",
        centurion_id="ct1",
        rule_id="r1",
        scheduled_at=datetime.now(timezone.utc),
        attempt_number=1,
    )
    assert out == "q1"


@pytest.mark.asyncio
async def test_has_future_pending_and_count_sent_attempts():
    db = _Db()
    repo = FollowupRepository(db)  # type: ignore[arg-type]

    db.fetchrow_result = {"cnt": 2}
    assert await repo.count_sent_attempts(company_id="co1", lead_id="l1", rule_id="r1") == 2

    db.fetchrow_result = {"x": 1}
    assert await repo.has_future_pending(company_id="co1", lead_id="l1", rule_id="r1") is True

