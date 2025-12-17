from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from common.infrastructure.database.supabase_client import SupabaseDb
from modules.handoff.domain.deal import Deal

logger = logging.getLogger(__name__)


def _quote_ident(name: str) -> str:
    if not re.fullmatch(r"[a-z0-9_]+", name or ""):
        raise ValueError("invalid schema identifier")
    return f'"{name}"'


class HandoffService:
    def __init__(self, *, db: SupabaseDb):
        self._db = db

    async def execute_handoff(self, *, company_id: str, lead_id: str) -> Deal:
        crm = await self._db.fetchrow(
            "select schema_name from core.company_crms where company_id=$1 and is_primary=true limit 1",
            company_id,
        )
        if not crm or not crm.get("schema_name"):
            raise RuntimeError("Company CRM schema not provisioned")

        schema_name = str(crm["schema_name"])

        lead = await self._db.fetchrow("select * from core.leads where id=$1 and company_id=$2", lead_id, company_id)
        if not lead:
            raise RuntimeError("Lead not found")

        if str(lead.get("lifecycle_stage") or "") == "handoff_done":
            # already done; fetch last deal index if possible
            idx = await self._db.fetchrow(
                "select id, local_deal_id from core.deals_index where company_id=$1 and schema_name=$2 order by created_at desc limit 1",
                company_id,
                schema_name,
            )
            return Deal(
                company_id=company_id,
                schema_name=schema_name,
                local_deal_id=str(idx.get("local_deal_id")) if idx else "",
                deal_index_id=str(idx.get("id")) if idx else None,
                created_at=datetime.now(timezone.utc),
                payload={},
            )

        deal_payload = self._build_deal_payload(company_id=company_id, lead=lead)

        schema_quoted = _quote_ident(schema_name)
        row = await self._db.fetchrow(
            f"""
            insert into {schema_quoted}.deals (
              company_id,
              core_lead_id,
              deal_full_name,
              deal_phone,
              deal_email,
              deal_cpf,
              deal_status,
              pixel_config_id,
              contact_fingerprint,
              utm_campaign,
              utm_source,
              utm_medium
            )
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            returning id, created_at
            """,
            company_id,
            lead_id,
            deal_payload.get("deal_full_name"),
            deal_payload.get("deal_phone"),
            deal_payload.get("deal_email"),
            deal_payload.get("deal_cpf"),
            deal_payload.get("deal_status") or "negocio_novo",
            deal_payload.get("pixel_config_id"),
            deal_payload.get("contact_fingerprint"),
            deal_payload.get("utm_campaign"),
            deal_payload.get("utm_source"),
            deal_payload.get("utm_medium"),
        )
        if not row:
            raise RuntimeError("Failed to create tenant deal")

        local_deal_id = str(row["id"])
        created_at = row.get("created_at") or datetime.now(timezone.utc)

        idx = await self._db.fetchrow(
            """
            select id
            from core.deals_index
            where company_id=$1
              and schema_name=$2
              and local_deal_id=$3
            limit 1
            """,
            company_id,
            schema_name,
            local_deal_id,
        )
        deal_index_id = str(idx["id"]) if idx else None

        await self._db.execute(
            """
            update core.leads
            set lifecycle_stage='handoff_done',
                qualification_data = coalesce(qualification_data, '{}'::jsonb)
                  || jsonb_build_object('deal_index_id', $3, 'local_deal_id', $4, 'schema_name', $5),
                updated_at=now()
            where id=$1 and company_id=$2
            """,
            lead_id,
            company_id,
            deal_index_id,
            local_deal_id,
            schema_name,
        )

        logger.info(
            "handoff.completed",
            extra={"extra": {"company_id": company_id, "lead_id": lead_id, "deal_index_id": deal_index_id, "schema": schema_name}},
        )

        return Deal(
            company_id=company_id,
            schema_name=schema_name,
            local_deal_id=local_deal_id,
            deal_index_id=deal_index_id,
            created_at=created_at,
            payload=deal_payload,
        )

    def _build_deal_payload(self, *, company_id: str, lead: Any) -> dict[str, Any]:
        utm_campaign = lead.get("utm_campaign")
        utm_source = lead.get("utm_source")
        utm_medium = lead.get("utm_medium")

        return {
            "company_id": company_id,
            "deal_full_name": lead.get("name"),
            "deal_phone": lead.get("phone"),
            "deal_email": lead.get("email"),
            "deal_cpf": lead.get("cpf"),
            "deal_status": "negocio_novo",
            "pixel_config_id": lead.get("pixel_config_id"),
            "contact_fingerprint": lead.get("contact_fingerprint"),
            "utm_campaign": utm_campaign,
            "utm_source": utm_source,
            "utm_medium": utm_medium,
        }

