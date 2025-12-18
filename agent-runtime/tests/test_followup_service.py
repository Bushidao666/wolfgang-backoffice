from __future__ import annotations

from datetime import datetime, timezone

import pytest

from modules.followups.domain.followup_rule import FollowupRule
from modules.followups.repository.followup_repository import FollowupQueueItem
from modules.followups.services.followup_service import FollowupService


class _Db:
    def __init__(self):
        self.rows: dict[str, object] = {}
        self.executed: list[tuple[str, tuple[object, ...]]] = []

    async def fetchrow(self, query: str, *args):
        if "from core.leads" in query and "last_contact_at" in query:
            return self.rows.get("lead_last_contact")
        if "from core.leads" in query and "select *" in query:
            return self.rows.get("lead_row")
        if "from core.conversations" in query:
            return self.rows.get("conv_row")
        return None

    async def execute(self, query: str, *args):
        self.executed.append((query, args))
        return "OK"


class _Repo:
    def __init__(self, rule: FollowupRule | None):
        self.rule = rule
        self.failed: list[tuple[str, str]] = []
        self.sent: list[tuple[str, str]] = []
        self.scheduled: list[tuple[str, int]] = []

    async def get_rule_by_id(self, *, rule_id: str):
        return self.rule if self.rule and self.rule.id == rule_id else None

    async def mark_failed(self, *, queue_id: str, error: str):
        self.failed.append((queue_id, error))

    async def mark_sent(self, *, queue_id: str, message_id: str | None):
        self.sent.append((queue_id, str(message_id)))

    async def schedule(self, *, company_id: str, lead_id: str, centurion_id: str, rule_id: str, scheduled_at: datetime, attempt_number: int):  # noqa: ARG002
        self.scheduled.append((rule_id, attempt_number))
        return "q2"

    async def cancel_pending_for_lead(self, *, company_id: str, lead_id: str):  # noqa: ARG002
        return 0

    async def claim_due(self, *, limit: int = 20):  # noqa: ARG002
        return []

    async def list_active_rules(self, *, company_id: str, centurion_id: str):  # noqa: ARG002
        return []

    async def count_sent_attempts(self, *, company_id: str, lead_id: str, rule_id: str):  # noqa: ARG002
        return 0

    async def has_future_pending(self, *, company_id: str, lead_id: str, rule_id: str):  # noqa: ARG002
        return False


class _MsgRepo:
    def __init__(self):
        self.saved: list[dict] = []

    async def save_message(self, **kwargs):
        self.saved.append(kwargs)
        return "m1"


class _Sender:
    def __init__(self):
        self.sent: list[dict] = []

    async def send_text(self, **kwargs):
        self.sent.append(kwargs)


@pytest.mark.asyncio
async def test_handle_marks_failed_when_rule_missing():
    db = _Db()
    service = FollowupService(db=db, redis=object())  # type: ignore[arg-type]
    service._repo = _Repo(rule=None)  # type: ignore[attr-defined]

    item = FollowupQueueItem(
        id="q1",
        company_id="co1",
        lead_id="l1",
        centurion_id="ct1",
        rule_id="r1",
        scheduled_at=datetime.now(timezone.utc),
        attempt_number=1,
        status="processing",
    )

    await service._handle(item)  # noqa: SLF001
    assert service._repo.failed  # type: ignore[attr-defined]
    assert service._repo.failed[0][0] == "q1"  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_handle_sends_followup_and_reschedules_when_more_attempts(monkeypatch):
    rule = FollowupRule(
        id="r1",
        company_id="co1",
        centurion_id="ct1",
        name="r",
        inactivity_hours=24,
        template=" Oi ",
        max_attempts=2,
        is_active=True,
    )
    db = _Db()
    db.rows["lead_row"] = {"phone": "+55119999", "is_qualified": False}
    db.rows["conv_row"] = {"id": "conv1", "channel_type": "whatsapp", "channel_instance_id": "inst1"}

    service = FollowupService(db=db, redis=object())  # type: ignore[arg-type]
    repo = _Repo(rule=rule)
    msg_repo = _MsgRepo()
    sender = _Sender()
    service._repo = repo  # type: ignore[attr-defined]
    service._msg_repo = msg_repo  # type: ignore[attr-defined]
    service._sender = sender  # type: ignore[attr-defined]

    item = FollowupQueueItem(
        id="q1",
        company_id="co1",
        lead_id="l1",
        centurion_id="ct1",
        rule_id="r1",
        scheduled_at=datetime.now(timezone.utc),
        attempt_number=1,
        status="processing",
    )

    # Force deterministic base message (no OpenAI configured)
    class _NoOpenAI:
        async def resolve_optional(self, *, company_id: str):  # noqa: ARG002
            return None

    service._openai = _NoOpenAI()  # type: ignore[attr-defined]

    await service._handle(item)  # noqa: SLF001

    assert not repo.failed
    assert repo.sent == [("q1", "m1")]
    assert sender.sent
    assert sender.sent[0]["text"] == "Oi"
    assert msg_repo.saved[0]["content"] == "Oi"
    assert repo.scheduled == [("r1", 2)]
    assert len(db.executed) >= 2
