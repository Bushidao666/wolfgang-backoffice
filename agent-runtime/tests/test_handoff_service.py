from __future__ import annotations

from datetime import datetime, timezone

import pytest

from modules.handoff.services.handoff_service import HandoffService, _quote_ident


class _Db:
    def __init__(self):
        self.rows: dict[str, object] = {}
        self.executed: list[tuple[str, tuple[object, ...]]] = []

    async def fetchrow(self, query: str, *args):  # noqa: ARG002
        if "from core.company_crms" in query:
            return self.rows.get("crm")
        if "from core.leads" in query:
            return self.rows.get("lead")
        if "from core.deals_index" in query:
            return self.rows.get("idx")
        return None

    async def execute(self, query: str, *args):  # noqa: ARG002
        self.executed.append((query, args))
        return "OK"


def test_quote_ident_rejects_invalid():
    with pytest.raises(ValueError):
        _quote_ident("bad schema")
    assert _quote_ident("tenant_a") == '"tenant_a"'


@pytest.mark.asyncio
async def test_execute_handoff_returns_last_index_when_already_done():
    db = _Db()
    db.rows["crm"] = {"schema_name": "tenant_a"}
    db.rows["lead"] = {"id": "l1", "company_id": "co1", "lifecycle_stage": "handoff_done"}
    db.rows["idx"] = {"id": "idx1", "local_deal_id": "d1"}

    service = HandoffService(db=db)  # type: ignore[arg-type]
    deal = await service.execute_handoff(company_id="co1", lead_id="l1")

    assert deal.company_id == "co1"
    assert deal.schema_name == "tenant_a"
    assert deal.deal_index_id == "idx1"
    assert deal.local_deal_id == "d1"
    assert isinstance(deal.created_at, datetime)

