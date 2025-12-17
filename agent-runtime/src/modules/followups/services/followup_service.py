from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from modules.centurion.domain.message import Message as DomainMessage
from modules.centurion.repository.config_repository import ConfigRepository
from modules.centurion.repository.conversation_repository import ConversationRepository
from modules.centurion.repository.message_repository import MessageRepository
from modules.centurion.repository.lead_repository import LeadRepository
from modules.centurion.services.prompt_builder import PromptBuilder
from modules.centurion.services.whatsapp_sender import WhatsAppSender
from modules.followups.repository.followup_repository import FollowupQueueItem, FollowupRepository
from modules.memory.adapters.knowledge_base_adapter import KnowledgeBaseAdapter
from modules.memory.adapters.rag_adapter import RagAdapter
from modules.memory.services.short_term_memory import ShortTermMemory

logger = logging.getLogger(__name__)


class FollowupService:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._repo = FollowupRepository(db)
        self._lead_repo = LeadRepository(db)
        self._conv_repo = ConversationRepository(db)
        self._msg_repo = MessageRepository(db)
        self._config_repo = ConfigRepository(db)
        self._prompt_builder = PromptBuilder()
        self._sender = WhatsAppSender(redis)
        self._short_term = ShortTermMemory(db=db, redis=redis)
        self._rag = RagAdapter(db=db, redis=redis)
        self._kb = KnowledgeBaseAdapter(db=db, redis=redis)

    async def cancel_pending(self, *, company_id: str, lead_id: str) -> int:
        return await self._repo.cancel_pending_for_lead(company_id=company_id, lead_id=lead_id)

    async def schedule_for_lead(self, *, company_id: str, lead_id: str, centurion_id: str) -> int:
        lead_row = await self._db.fetchrow("select last_contact_at from core.leads where id=$1 and company_id=$2", lead_id, company_id)
        if not lead_row or not lead_row.get("last_contact_at"):
            return 0

        last_contact_at: datetime = lead_row["last_contact_at"]
        rules = await self._repo.list_active_rules(company_id=company_id, centurion_id=centurion_id)
        if not rules:
            return 0

        scheduled = 0
        for rule in rules:
            if not rule.id or not rule.template.strip():
                continue
            sent_attempts = await self._repo.count_sent_attempts(company_id=company_id, lead_id=lead_id, rule_id=rule.id)
            if sent_attempts >= rule.max_attempts:
                continue
            if await self._repo.has_future_pending(company_id=company_id, lead_id=lead_id, rule_id=rule.id):
                continue
            scheduled_at = last_contact_at + timedelta(hours=rule.inactivity_hours)
            attempt_number = sent_attempts + 1
            created = await self._repo.schedule(
                company_id=company_id,
                lead_id=lead_id,
                centurion_id=centurion_id,
                rule_id=rule.id,
                scheduled_at=scheduled_at,
                attempt_number=attempt_number,
            )
            if created:
                scheduled += 1

        if scheduled:
            await self._db.execute(
                """
                update core.leads
                set lifecycle_stage='follow_up_pending', updated_at=now()
                where id=$1 and company_id=$2 and lifecycle_stage not in ('qualified', 'handoff_done', 'closed_lost')
                """,
                lead_id,
                company_id,
            )

        return scheduled

    async def process_due(self, *, limit: int = 20) -> int:
        due = await self._repo.claim_due(limit=limit)
        if not due:
            return 0
        for item in due:
            await self._handle(item)
        return len(due)

    async def _handle(self, item: FollowupQueueItem) -> None:
        try:
            rule = await self._repo.get_rule_by_id(rule_id=item.rule_id) if item.rule_id else None
            if not rule or not rule.is_active:
                await self._repo.mark_failed(queue_id=item.id, error="Missing or inactive follow-up rule")
                return

            lead_row = await self._db.fetchrow("select * from core.leads where id=$1 and company_id=$2", item.lead_id, item.company_id)
            if not lead_row or not lead_row.get("phone"):
                await self._repo.mark_failed(queue_id=item.id, error="Lead not found")
                return

            if bool(lead_row.get("is_qualified")):
                await self._repo.mark_failed(queue_id=item.id, error="Lead already qualified")
                return

            conv_row = await self._db.fetchrow(
                """
                select id, channel_type, channel_instance_id
                from core.conversations
                where company_id=$1 and lead_id=$2
                order by updated_at desc
                limit 1
                """,
                item.company_id,
                item.lead_id,
            )
            if not conv_row:
                await self._repo.mark_failed(queue_id=item.id, error="Conversation not found")
                return

            conversation_id = str(conv_row["id"])
            channel_type = str(conv_row.get("channel_type") or "whatsapp")
            instance_id = str(conv_row.get("channel_instance_id")) if conv_row.get("channel_instance_id") else None
            if channel_type not in ("whatsapp", "instagram", "telegram") or not instance_id:
                await self._repo.mark_failed(
                    queue_id=item.id, error=f"Unsupported channel for follow-up: {channel_type}"
                )
                return

            message = await self._generate_followup_message(
                company_id=item.company_id,
                centurion_id=item.centurion_id,
                lead_id=item.lead_id,
                conversation_id=conversation_id,
                template=rule.template,
            )

            msg_id = await self._msg_repo.save_message(
                conversation_id=conversation_id,
                company_id=item.company_id,
                lead_id=item.lead_id,
                direction="outbound",
                content_type="text",
                content=message,
                metadata={"followup_queue_id": item.id, "rule_id": rule.id, "attempt": item.attempt_number},
            )

            await self._sender.send_text(
                company_id=item.company_id,
                instance_id=instance_id,
                to_number=str(lead_row["phone"]),
                text=message,
                correlation_id=item.id,
                causation_id=item.id,
                metadata={"followup_queue_id": item.id, "rule_id": rule.id, "attempt": item.attempt_number},
            )

            await self._repo.mark_sent(queue_id=item.id, message_id=str(msg_id))

            await self._db.execute(
                """
                update core.leads
                set last_contact_at=now(),
                    lifecycle_stage='follow_up_sent',
                    updated_at=now()
                where id=$1 and company_id=$2
                """,
                item.lead_id,
                item.company_id,
            )

            if item.attempt_number < rule.max_attempts:
                await self._repo.schedule(
                    company_id=item.company_id,
                    lead_id=item.lead_id,
                    centurion_id=item.centurion_id,
                    rule_id=rule.id,
                    scheduled_at=datetime.now(timezone.utc) + timedelta(hours=rule.inactivity_hours),
                    attempt_number=item.attempt_number + 1,
                )
                await self._db.execute(
                    """
                    update core.leads
                    set lifecycle_stage='follow_up_pending', updated_at=now()
                    where id=$1 and company_id=$2 and lifecycle_stage not in ('qualified', 'handoff_done', 'closed_lost')
                    """,
                    item.lead_id,
                    item.company_id,
                )
        except Exception as err:
            logger.exception("followup.process_failed", extra={"queue_id": item.id})
            await self._repo.mark_failed(queue_id=item.id, error=str(err))

    async def _generate_followup_message(
        self,
        *,
        company_id: str,
        centurion_id: str,
        lead_id: str,
        conversation_id: str,
        template: str,
    ) -> str:
        base = template.strip()
        settings = get_settings()
        if not settings.openai_api_key:
            return base

        config = await self._config_repo.get_centurion_config(company_id=company_id, centurion_id=centurion_id)
        history = await self._short_term.get_conversation_history(conversation_id=conversation_id, limit=20)

        query = base[:500]
        rag_items: list[dict[str, Any]] = []
        kb_items: list[dict[str, Any]] = []
        try:
            rag_items = await self._rag.get_relevant_context(lead_id=lead_id, query=query, top_k=5)
        except Exception:
            logger.exception("followup.rag_failed")
        try:
            kb_items = await self._kb.search_knowledge(company_id=company_id, query=query, top_k=5)
        except Exception:
            logger.exception("followup.kb_failed")

        instruction = (
            "Você vai enviar uma mensagem de follow-up proativa para reengajar o lead.\n"
            "Use o template abaixo como base, mas adapte para soar natural e alinhado ao tom do Centurion.\n"
            "Seja curto, educado e faça UMA pergunta para incentivar resposta.\n"
            "Não invente informações.\n\n"
            f"TEMPLATE:\n{base}"
        )

        prompt = self._prompt_builder.build(
            centurion_config=config,
            history=history,
            consolidated_user_message=instruction,
            pending_count=1,
            rag_items=rag_items,
            knowledge_items=kb_items,
        )

        try:
            from agno.agent import Agent
            from agno.models.openai import OpenAIChat
        except Exception:
            logger.exception("agno.import_failed")
            return base

        agent = Agent(
            model=OpenAIChat(
                id=settings.openai_chat_model,
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                temperature=0.3,
                timeout=30.0,
            ),
            system_message=prompt.system,
            build_context=True,
            telemetry=False,
            debug_mode=False,
        )

        try:
            output = await agent.arun([m for m in prompt.messages if m.get("role") != "system"], stream=False)
            content = getattr(output, "content", None)
            if isinstance(content, str) and content.strip():
                return content.strip()
        except Exception:
            logger.exception("followup.llm_failed")

        return base
