from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from common.config.logging import company_id_ctx, correlation_id_ctx, request_id_ctx
from common.config.settings import get_settings
from common.infrastructure.agno.memory import AgnoAgentFactory
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.events.envelope import build_envelope
from common.infrastructure.idempotency.idempotency_store import IdempotencyStore
from common.infrastructure.integrations.openai_resolver import OpenAIResolver
from common.infrastructure.metrics.prometheus import DOMAIN_EVENTS_TOTAL, LEADS_QUALIFIED_TOTAL
from modules.centurion.domain.message import Message as DomainMessage
from modules.centurion.media.media_tool import MediaTool
from modules.centurion.repository.config_repository import ConfigRepository
from modules.centurion.repository.conversation_repository import ConversationRepository
from modules.centurion.repository.lead_repository import LeadRepository
from modules.centurion.repository.message_repository import MessageRepository
from modules.centurion.qualification.criteria_engine import compute_rules_hash
from modules.centurion.services.prompt_builder import PromptBuilder
from modules.centurion.services.qualification_service import QualificationService
from modules.centurion.services.response_builder import ChunkConfig, ResponseBuilder
from modules.centurion.services.whatsapp_sender import WhatsAppSender
from modules.channels.services.channel_router import ChannelRouter
from modules.memory.services.short_term_memory import ShortTermMemory
from modules.memory.adapters.rag_adapter import RagAdapter
from modules.memory.adapters.knowledge_base_adapter import KnowledgeBaseAdapter
from modules.memory.repository.fact_repository import FactRepository
from modules.memory.services.embedding_service import EmbeddingService
from modules.memory.services.fact_extractor import FactExtractor
from modules.followups.services.followup_service import FollowupService
from modules.handoff.services.handoff_service import HandoffService
from modules.tools.repository.tool_repository import ToolRepository
from modules.tools.services.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)


class CenturionService:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._lead_repo = LeadRepository(db)
        self._conv_repo = ConversationRepository(db)
        self._msg_repo = MessageRepository(db)
        self._config_repo = ConfigRepository(db)
        self._prompt_builder = PromptBuilder()
        self._response_builder = ResponseBuilder()
        self._qualification = QualificationService(prompt_builder=self._prompt_builder)
        self._idempotency = IdempotencyStore(db)
        self._sender = WhatsAppSender(redis, idempotency=self._idempotency)
        self._short_term = ShortTermMemory(db=db, redis=redis)
        self._rag = RagAdapter(db=db, redis=redis)
        self._kb = KnowledgeBaseAdapter(db=db, redis=redis)
        self._fact_repo = FactRepository(db)
        self._embeddings = EmbeddingService(db=db, redis=redis)
        self._fact_extractor = FactExtractor(db=db)
        self._tools = ToolRegistry(repo=ToolRepository(db))
        self._media_tool = MediaTool(db=db)
        self._channel_router = ChannelRouter()
        self._followups = FollowupService(db=db, redis=redis)
        self._handoff = HandoffService(db=db)
        self._openai = OpenAIResolver(db)
        self._agno_factory = AgnoAgentFactory(db=db)
        self._tool_hooks = self._agno_factory.default_tool_hooks()

    async def test_centurion(self, *, company_id: str, centurion_id: str, message: str) -> dict[str, Any]:
        row = await self._db.fetchrow(
            "select * from core.centurion_configs where id=$1 and company_id=$2",
            centurion_id,
            company_id,
        )
        if not row:
            raise ValueError("Centurion not found")

        config = dict(row)
        prompt = str(config.get("prompt") or "Você é um SDR educado e objetivo.")
        messages: list[dict[str, str]] = [{"role": "system", "content": prompt}, {"role": "user", "content": message}]

        response_text = await self._call_llm(messages, config=config, company_id=company_id, centurion_id=centurion_id)
        if not response_text:
            raise RuntimeError("LLM returned empty response")

        resolved = await self._openai.resolve_optional(company_id=company_id)
        return {"ok": True, "model": (resolved.chat_model if resolved else get_settings().openai_chat_model), "response": response_text, "usage": {}}

    async def process_due_conversation(self, conversation_id: str, *, causation_id: str | None = None) -> None:
        conv_row = await self._db.fetchrow("select * from core.conversations where id=$1", conversation_id)
        if not conv_row:
            return

        meta = dict(conv_row.get("metadata") or {})
        company_id = str(conv_row["company_id"])
        correlation_id = str(
            meta.get("last_correlation_id")
            or meta.get("correlation_id")
            or causation_id
            or conversation_id
        )
        derived_causation_id = meta.get("last_event_id") or meta.get("causation_id") or causation_id
        resolved_causation_id = str(derived_causation_id) if derived_causation_id else None

        token_req = request_id_ctx.set(str(uuid.uuid4()))
        token_corr = correlation_id_ctx.set(correlation_id)
        token_company = company_id_ctx.set(company_id)

        pending_messages: list[str] = []
        try:
            await self._conv_repo.mark_processing(conversation_id)

            pending_messages = list(conv_row.get("pending_messages") or [])
            if not pending_messages:
                await self._conv_repo.clear_pending(conversation_id)
                return

            lead_id = str(conv_row["lead_id"])
            centurion_id = str(conv_row["centurion_id"])
            instance_id = str(conv_row["channel_instance_id"]) if conv_row.get("channel_instance_id") else None
            channel_type = str(conv_row.get("channel_type") or "whatsapp")

            if not instance_id:
                await self._conv_repo.clear_pending(conversation_id)
                return

            lead_row = await self._db.fetchrow("select * from core.leads where id=$1", lead_id)
            if not lead_row:
                await self._conv_repo.clear_pending(conversation_id)
                return

            lead_phone = lead_row.get("phone")
            if not lead_phone:
                await self._conv_repo.clear_pending(conversation_id)
                return
            lead_data = dict(lead_row.get("qualification_data") or {})

            config = await self._config_repo.get_centurion_config(company_id=company_id, centurion_id=centurion_id)
            capabilities = self._channel_router.get_capabilities(channel_type=channel_type)
            include_media_tools = any(
                capabilities.supports_outbound_type(t) for t in ("image", "video", "audio", "document")
            )

            history_limit = 25
            agno_session = meta.get("agno_session")
            if isinstance(agno_session, dict) and agno_session.get("summary"):
                history_limit = 15

            history = await self._short_term.get_conversation_history(conversation_id=conversation_id, limit=history_limit)
            consolidated = "\n".join([m for m in pending_messages if m]).strip()

            rag_items = []
            kb_items = []
            if await self._openai.resolve_optional(company_id=company_id):
                try:
                    rag_items = await self._rag.get_relevant_context(company_id=company_id, lead_id=lead_id, query=consolidated, top_k=5)
                except Exception:
                    logger.exception("rag.lookup_failed")
                try:
                    kb_items = await self._kb.search_knowledge(company_id=company_id, query=consolidated, top_k=5)
                except Exception:
                    logger.exception("kb.lookup_failed")

            prompt = self._prompt_builder.build(
                centurion_config=config,
                history=history,
                consolidated_user_message=consolidated,
                pending_count=len(pending_messages),
                rag_items=rag_items,
                knowledge_items=kb_items,
                include_media_tools=include_media_tools,
            )

            response_text = await self._call_llm(
                prompt.messages,
                config=config,
                company_id=company_id,
                centurion_id=centurion_id,
                conversation_id=conversation_id,
                lead_id=lead_id,
                include_media_tools=include_media_tools,
            )
            if not response_text:
                response_text = "Perfeito! Pode me contar um pouco mais para eu te ajudar?"

            chunk_cfg = ChunkConfig(
                enabled=bool(config.get("message_chunking_enabled", True)),
                max_chars=int(config.get("chunk_max_chars") or 280),
                delay_ms=int(config.get("chunk_delay_ms") or 1500),
            )
            cleaned_text, media_plan = self._response_builder.extract_media_plan(response_text)
            outbound_messages = self._response_builder.build_outbound_messages(
                text=cleaned_text,
                chunk_config=chunk_cfg,
                media_plan=media_plan,
            )
            if not outbound_messages:
                cleaned_text = "Perfeito! Pode me contar um pouco mais para eu te ajudar?"
                outbound_messages = [{"type": "text", "text": cleaned_text}]

            outbound_messages = self._channel_router.filter_outbound(channel_type=channel_type, messages=outbound_messages)
            if not outbound_messages:
                cleaned_text = cleaned_text or "Perfeito! Pode me contar um pouco mais para eu te ajudar?"
                outbound_messages = [{"type": "text", "text": cleaned_text}]
            # correlation_id/causation_id already resolved from the last inbound message context.

            for idx, msg in enumerate(outbound_messages):
                msg_type = msg.get("type")
                content_type = msg_type if msg_type in ("text", "audio", "image", "video", "document") else "text"
                content = msg.get("text") if content_type == "text" else msg.get("caption")
                msg_id = await self._msg_repo.save_message(
                    conversation_id=conversation_id,
                    company_id=company_id,
                    lead_id=lead_id,
                    direction="outbound",
                    content_type=content_type,
                    content=content,
                    metadata={
                        "chunk_index": idx,
                        "chunks_total": len(outbound_messages),
                        "correlation_id": correlation_id,
                        "causation_id": resolved_causation_id,
                        "asset_id": msg.get("asset_id"),
                    },
                )

                try:
                    sent = await self._sender.send_message(
                        company_id=company_id,
                        instance_id=instance_id,
                        to_number=lead_phone,
                        message=msg,
                        channel_type=channel_type,
                        correlation_id=correlation_id,
                        causation_id=resolved_causation_id,
                        metadata={"chunk_index": idx, "chunks_total": len(outbound_messages)},
                    )
                    if not sent:
                        await self._msg_repo.delete_message(message_id=msg_id)
                        continue
                except Exception:
                    await self._msg_repo.delete_message(message_id=msg_id)
                    raise

                if (
                    content_type == "text"
                    and idx < len(outbound_messages) - 1
                    and outbound_messages[idx + 1].get("type") == "text"
                ):
                    await asyncio.sleep(chunk_cfg.delay_ms / 1000.0)

            await self._db.execute(
                "update core.conversations set last_outbound_at=now(), updated_at=now() where id=$1",
                conversation_id,
            )
            await self._conv_repo.clear_pending(conversation_id)
            await self._short_term.invalidate_cache(conversation_id)
            await self._lead_repo.touch_outbound(company_id=company_id, lead_id=lead_id)
            if channel_type == "whatsapp":
                await self._followups.schedule_for_lead(company_id=company_id, lead_id=lead_id, centurion_id=centurion_id)

            rules = dict(config.get("qualification_rules") or {})
            latest_context = self._append_context(history, consolidated, cleaned_text)
            conversation_text = "\n".join([m.as_prompt_text for m in latest_context if m.as_prompt_text])
            llm = await self._openai.resolve_optional(company_id=company_id)
            if llm:
                result = await self._qualification.aevaluate(
                    qualification_rules=rules,
                    conversation_text=conversation_text,
                    previous_data=lead_data,
                    llm=llm,
                )
            else:
                result = self._qualification.evaluate(
                    qualification_rules=rules,
                    conversation_text=conversation_text,
                    previous_data=lead_data,
                )

            try:
                await self._record_qualification_event(
                    company_id=company_id,
                    lead_id=lead_id,
                    conversation_id=conversation_id,
                    centurion_id=centurion_id,
                    correlation_id=correlation_id,
                    causation_id=resolved_causation_id,
                    qualification_rules=rules,
                    result=result,
                    lead_was_qualified=bool(lead_row.get("is_qualified")),
                )
            except Exception:
                logger.exception("qualification_event.persist_failed")

            if result.qualified_at and not bool(lead_row.get("is_qualified")):
                await self._lead_repo.update_qualification(
                    lead_id=lead_id,
                    company_id=company_id,
                    score=result.score,
                    data={"criteria": result.criteria_met, "summary": result.summary, **result.extracted},
                    qualified_at=result.qualified_at,
                )
                await self._publish_lead_qualified(
                    company_id=company_id,
                    lead_id=lead_id,
                    score=result.score,
                    criteria=[k for k, v in result.criteria_met.items() if v],
                    summary=result.summary,
                    correlation_id=correlation_id,
                    causation_id=resolved_causation_id,
                )
                await self._followups.cancel_pending(company_id=company_id, lead_id=lead_id)

                try:
                    deal = await self._handoff.execute_handoff(company_id=company_id, lead_id=lead_id)
                    closing = "Perfeito! Vou encaminhar suas informações para um especialista e ele vai continuar o atendimento com você. Obrigado!"
                    msg_id = await self._msg_repo.save_message(
                        conversation_id=conversation_id,
                        company_id=company_id,
                        lead_id=lead_id,
                        direction="outbound",
                        content_type="text",
                        content=closing,
                        metadata={
                            "chunk_index": len(outbound_messages),
                            "chunks_total": len(outbound_messages) + 1,
                            "correlation_id": correlation_id,
                            "causation_id": resolved_causation_id,
                            "handoff": True,
                            "deal_index_id": deal.deal_index_id,
                            "local_deal_id": deal.local_deal_id,
                        },
                    )
                    try:
                        sent = await self._sender.send_message(
                            company_id=company_id,
                            instance_id=instance_id,
                            to_number=lead_phone,
                            message={"type": "text", "text": closing},
                            channel_type=channel_type,
                            correlation_id=correlation_id,
                            causation_id=resolved_causation_id,
                            metadata={
                                "chunk_index": len(outbound_messages),
                                "chunks_total": len(outbound_messages) + 1,
                                "handoff": True,
                                "deal_index_id": deal.deal_index_id,
                                "local_deal_id": deal.local_deal_id,
                            },
                        )
                        if not sent:
                            await self._msg_repo.delete_message(message_id=msg_id)
                    except Exception:
                        await self._msg_repo.delete_message(message_id=msg_id)
                        raise

                    await self._db.execute(
                        """
                        update core.conversations
                        set lead_state='inactive', updated_at=now()
                        where id=$1
                        """,
                        conversation_id,
                    )
                    await self._short_term.invalidate_cache(conversation_id)
                except Exception:
                    logger.exception("handoff.failed")

            asyncio.create_task(
                self._update_long_term_memory(
                    company_id=company_id,
                    lead_id=lead_id,
                    conversation_text=conversation_text,
                )
            )
        finally:
            request_id_ctx.reset(token_req)
            correlation_id_ctx.reset(token_corr)
            company_id_ctx.reset(token_company)

    async def _call_llm(
        self,
        messages: list[dict[str, str]],
        *,
        config: dict[str, Any],
        company_id: str,
        centurion_id: str,
        conversation_id: str | None = None,
        lead_id: str | None = None,
        include_media_tools: bool = False,
    ) -> str | None:
        resolved = await self._openai.resolve_optional(company_id=company_id)
        if not resolved:
            # Fallback determinístico (sem dependência externa): pergunta sobre critérios faltantes.
            required = list((config.get("qualification_rules") or {}).get("required_fields") or [])
            if required:
                return (
                    "Para eu te ajudar melhor, preciso de algumas informações: "
                    + ", ".join(required)
                    + "."
                )
            return "Me conte um pouco mais sobre o que você precisa."

        try:
            from agno.agent import Agent
            from agno.models.openai import OpenAIChat
        except Exception:
            logger.exception("agno.import_failed")
            return None

        system = next((m.get("content") for m in messages if m.get("role") == "system" and m.get("content")), None)
        if not isinstance(system, str) or not system.strip():
            system = config.get("prompt") or "Você é um SDR educado e objetivo."
        chat_messages = [m for m in messages if m.get("role") != "system"]

        tools = []
        try:
            tools = await self._tools.get_tools(company_id=company_id, centurion_id=centurion_id)
        except Exception:
            logger.exception("tools.load_failed")

        if include_media_tools:
            try:
                if not any(getattr(t, "name", None) == "media_search_assets" for t in tools):
                    tools.append(self._media_tool.as_function(company_id=company_id, centurion_id=centurion_id))
            except Exception:
                logger.exception("media_tool.load_failed")

        tool_call_limit = int(config.get("tool_call_limit") or 8)

        if conversation_id and lead_id:
            agent = self._agno_factory.build_agent(
                company_id=company_id,
                lead_id=lead_id,
                conversation_id=conversation_id,
                centurion_id=centurion_id,
                llm=resolved,
                system_message=system,
                tools=tools,
                tool_hooks=self._tool_hooks,
                tool_call_limit=tool_call_limit,
            )
        else:
            agent = Agent(
                model=OpenAIChat(
                    id=resolved.chat_model,
                    api_key=resolved.api_key,
                    base_url=resolved.base_url,
                    temperature=0.3,
                    timeout=30.0,
                ),
                system_message=system,
                tools=tools or None,
                tool_hooks=self._tool_hooks,
                tool_call_limit=tool_call_limit,
                build_context=True,
                telemetry=False,
                debug_mode=False,
            )

        try:
            output = await agent.arun(chat_messages, stream=False)
            content = getattr(output, "content", None)
            if isinstance(content, str):
                return content
            if content is None:
                return None
            return str(content)
        except Exception:
            logger.exception("agno.run_failed")
            return None

    def _append_context(self, history: list[DomainMessage], user_text: str, assistant_text: str) -> list[DomainMessage]:
        enriched = list(history)
        enriched.append(
            DomainMessage(
                id="__pending_user__",
                conversation_id=history[-1].conversation_id if history else "",
                company_id=history[-1].company_id if history else "",
                lead_id=history[-1].lead_id if history else "",
                direction="inbound",
                content_type="text",
                content=user_text,
            )
        )
        enriched.append(
            DomainMessage(
                id="__pending_assistant__",
                conversation_id=history[-1].conversation_id if history else "",
                company_id=history[-1].company_id if history else "",
                lead_id=history[-1].lead_id if history else "",
                direction="outbound",
                content_type="text",
                content=assistant_text,
            )
        )
        return enriched

    async def _update_long_term_memory(self, *, company_id: str, lead_id: str, conversation_text: str) -> None:
        try:
            if not await self._openai.resolve_optional(company_id=company_id):
                return
            facts = await self._fact_extractor.extract(company_id=company_id, conversation_text=conversation_text)
            if not facts:
                return
            embeddings = await self._embeddings.embed(company_id=company_id, texts=[f.text for f in facts])
            for fact, vec in zip(facts, embeddings, strict=False):
                if not vec:
                    continue
                await self._fact_repo.save_fact(company_id=company_id, lead_id=lead_id, fact=fact, embedding=vec)
        except Exception:
            logger.exception("rag.update_failed")

    async def _publish_lead_qualified(
        self,
        *,
        company_id: str,
        lead_id: str,
        score: float,
        criteria: list[str],
        summary: str,
        correlation_id: str,
        causation_id: str | None,
    ) -> None:
        event = build_envelope(
            type="lead.qualified",
            company_id=company_id,
            source="agent-runtime",
            correlation_id=correlation_id,
            causation_id=causation_id,
            payload={
                "company_id": company_id,
                "lead_id": lead_id,
                "score": score,
                "criteria": criteria,
                "summary": summary,
            },
        )
        DOMAIN_EVENTS_TOTAL.labels(type="lead.qualified").inc()
        LEADS_QUALIFIED_TOTAL.inc()
        await self._redis.publish("lead.qualified", json.dumps(event, ensure_ascii=False))

    async def _record_qualification_event(
        self,
        *,
        company_id: str,
        lead_id: str,
        conversation_id: str,
        centurion_id: str,
        correlation_id: str,
        causation_id: str | None,
        qualification_rules: dict[str, Any],
        result: QualificationResult,
        lead_was_qualified: bool,
    ) -> None:
        consumer = "agent-runtime:lead_qualification_events"
        dedupe_key = f"{lead_id}:{correlation_id}"
        rules_hash = compute_rules_hash(qualification_rules or {})

        claimed = await self._idempotency.claim(
            company_id=company_id,
            consumer=consumer,
            key=dedupe_key,
            ttl_seconds=7 * 24 * 3600,
            event_type="lead.qualification_evaluated",
            correlation_id=correlation_id,
            causation_id=causation_id,
            metadata={"lead_id": lead_id, "conversation_id": conversation_id, "rules_hash": rules_hash},
        )
        if not claimed:
            return

        try:
            await self._db.fetchrow(
                """
                insert into core.lead_qualification_events (
                  company_id,
                  lead_id,
                  conversation_id,
                  centurion_id,
                  correlation_id,
                  causation_id,
                  rules_hash,
                  rules,
                  threshold,
                  score,
                  is_qualified,
                  required_met,
                  criteria,
                  extracted,
                  summary,
                  metadata
                )
                values (
                  $1::uuid,
                  $2::uuid,
                  $3::uuid,
                  $4::uuid,
                  $5,
                  $6,
                  $7,
                  $8::jsonb,
                  $9,
                  $10,
                  $11,
                  $12,
                  $13::jsonb,
                  $14::jsonb,
                  $15,
                  $16::jsonb
                )
                """,
                company_id,
                lead_id,
                conversation_id,
                centurion_id,
                correlation_id,
                causation_id,
                rules_hash,
                qualification_rules or {},
                result.threshold,
                result.score,
                result.qualified_at is not None,
                result.required_met,
                result.criteria_details,
                result.extracted,
                result.summary,
                {"lead_was_qualified": lead_was_qualified},
            )
        except Exception:
            try:
                await self._idempotency.release(company_id=company_id, consumer=consumer, key=dedupe_key)
            except Exception:
                pass
            raise
