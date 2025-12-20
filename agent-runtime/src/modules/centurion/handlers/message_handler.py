from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from common.config.logging import company_id_ctx, correlation_id_ctx, request_id_ctx
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.events.envelope import EventParseError, build_envelope, parse_envelope
from common.infrastructure.idempotency.idempotency_store import IdempotencyStore
from common.infrastructure.metrics.prometheus import DOMAIN_EVENTS_TOTAL, LEADS_CREATED_TOTAL, MESSAGES_TOTAL
from modules.centurion.repository.config_repository import ConfigRepository
from modules.centurion.repository.conversation_repository import ConversationRepository
from modules.centurion.repository.lead_repository import LeadRepository
from modules.centurion.repository.message_repository import MessageRepository
from modules.channels.services.media_downloader import MediaDownloader
from modules.channels.services.channel_router import ChannelRouter
from modules.channels.services.stt_service import SpeechToTextService
from modules.channels.services.vision_service import VisionService
from modules.followups.services.followup_service import FollowupService
from modules.memory.services.short_term_memory import ShortTermMemory

logger = logging.getLogger(__name__)


class MessageHandler:
    def __init__(self, *, db: SupabaseDb, redis: RedisClient):
        self._db = db
        self._redis = redis
        self._lead_repo = LeadRepository(db)
        self._conv_repo = ConversationRepository(db)
        self._msg_repo = MessageRepository(db)
        self._config_repo = ConfigRepository(db)
        self._short_term = ShortTermMemory(db=db, redis=redis)
        self._followups = FollowupService(db=db, redis=redis)
        self._idempotency = IdempotencyStore(db)

        self._downloader = MediaDownloader()
        self._stt = SpeechToTextService(db=db)
        self._vision = VisionService(db=db)
        self._channel_router = ChannelRouter()

    async def handle_message_received(self, raw: str) -> None:
        try:
            envelope = parse_envelope(raw, expected_type="message.received")
        except EventParseError as err:
            logger.warning("message_received.invalid_envelope", extra={"extra": {"reason": err.reason}})
            return
        except Exception:
            logger.exception("message_received.invalid_envelope")
            return

        token_req = request_id_ctx.set(envelope.id)
        token_corr = correlation_id_ctx.set(envelope.correlation_id)
        token_company = company_id_ctx.set(envelope.company_id)

        # Prefer a stable idempotency key: correlation_id comes from the provider message id (Evolution).
        inbound_dedupe_key = f"{envelope.type}:{envelope.correlation_id}"
        consumer = "agent-runtime:message.received"

        claimed = False
        try:
            claimed = await self._idempotency.claim(
                company_id=envelope.company_id,
                consumer=consumer,
                key=inbound_dedupe_key,
                ttl_seconds=7 * 24 * 3600,
                event_type=envelope.type,
                event_id=envelope.id,
                correlation_id=envelope.correlation_id,
                causation_id=envelope.causation_id,
                metadata={"source": envelope.source},
            )
            if not claimed:
                logger.info("message_received.duplicate", extra={"extra": {"dedupe_key": inbound_dedupe_key}})
                return

            company_id = envelope.company_id
            payload = envelope.payload or {}
            if not isinstance(payload, dict):
                return

            instance_id = payload.get("instance_id")
            from_number = payload.get("from")
            body = payload.get("body")
            media = payload.get("media")

            if not instance_id or not from_number:
                return

            instance = await self._db.fetchrow(
                "select channel_type from core.channel_instances where id=$1 and company_id=$2",
                instance_id,
                company_id,
            )
            channel_type = str(instance.get("channel_type") or "whatsapp") if instance else "whatsapp"

            normalized = self._channel_router.normalize_inbound(channel_type=channel_type, payload=payload)

            lead, created = await self._lead_repo.get_or_create(company_id=company_id, phone=normalized.from_id)
            await self._followups.cancel_pending(company_id=company_id, lead_id=lead.id)
            config = await self._config_repo.get_centurion_config(company_id=company_id, centurion_id=lead.centurion_id)

            conversation = await self._conv_repo.get_or_create(
                company_id=company_id,
                lead_id=lead.id,
                centurion_id=str(config["id"]),
                channel_type=channel_type,
                channel_instance_id=instance_id,
            )

            content_type = "text"
            media_url: str | None = None
            media_mime: str | None = None
            if isinstance(media, dict):
                content_type = str(media.get("type") or "document")
                media_url = str(media.get("url")) if media.get("url") else None
                media_mime = str(media.get("mime_type")) if media.get("mime_type") else None

            inbound_content = normalized.body if isinstance(normalized.body, str) else None
            channel_message_id = normalized.raw.get("message_id") if isinstance(normalized.raw, dict) else None

            # Secondary dedupe guard: if the channel_message_id already exists in DB, skip.
            if isinstance(channel_message_id, str) and channel_message_id.strip():
                already = await self._msg_repo.exists_channel_message_id(
                    company_id=company_id,
                    channel_message_id=channel_message_id.strip(),
                )
                if already:
                    logger.info(
                        "message_received.duplicate_channel_message",
                        extra={"extra": {"channel_message_id": channel_message_id}},
                    )
                    return

            message_id = await self._msg_repo.save_message(
                conversation_id=conversation.id,
                company_id=company_id,
                lead_id=lead.id,
                direction="inbound",
                content_type=content_type,
                content=inbound_content,
                channel_message_id=channel_message_id,
                metadata={
                    "event_id": envelope.id,
                    "correlation_id": envelope.correlation_id,
                    "causation_id": envelope.causation_id,
                    "raw": normalized.raw or {},
                },
            )
            MESSAGES_TOTAL.labels(direction="inbound", channel_type=channel_type, content_type=content_type).inc()
            await self._lead_repo.touch_inbound(company_id=company_id, lead_id=lead.id)
            await self._short_term.invalidate_cache(conversation.id)

            enriched_text = inbound_content or ""
            if media_url:
                enriched_text = await self._process_media(
                    company_id=company_id,
                    message_id=message_id,
                    content_type=content_type,
                    media_url=media_url,
                    mime_type=media_mime or "application/octet-stream",
                    can_process_audio=bool(config.get("can_process_audio", True)),
                    can_process_image=bool(config.get("can_process_image", True)),
                    fallback=enriched_text,
                )

            if created:
                LEADS_CREATED_TOTAL.labels(channel_type=channel_type).inc()
                await self._publish_lead_created(
                    company_id=company_id,
                    lead_id=lead.id,
                    channel=channel_type,
                    correlation_id=envelope.correlation_id,
                    causation_id=envelope.id,
                )

            debounce_ms = int(config.get("debounce_wait_ms") or 3000)
            until = datetime.now(timezone.utc) + timedelta(milliseconds=debounce_ms)
            pending_count = await self._conv_repo.append_pending_message(
                conversation_id=conversation.id,
                message=enriched_text or "",
                debounce_until=until,
                last_inbound_at=datetime.now(timezone.utc),
                metadata_patch={"last_event_id": envelope.id, "last_correlation_id": envelope.correlation_id},
            )
            await self._publish_debounce_timer(
                company_id=company_id,
                conversation_id=conversation.id,
                lead_id=lead.id,
                instance_id=instance_id,
                debounce_until=until,
                pending_count=pending_count,
                correlation_id=envelope.correlation_id,
                causation_id=envelope.id,
            )
        except Exception:
            logger.exception("message_received.failed")
            # Release claim so a re-delivery can be processed.
            if claimed:
                try:
                    await self._idempotency.release(
                        company_id=envelope.company_id,
                        consumer=consumer,
                        key=inbound_dedupe_key,
                    )
                except Exception:
                    logger.exception("message_received.release_failed")
        finally:
            request_id_ctx.reset(token_req)
            correlation_id_ctx.reset(token_corr)
            company_id_ctx.reset(token_company)

    async def _process_media(
        self,
        *,
        company_id: str,
        message_id: str,
        content_type: str,
        media_url: str,
        mime_type: str,
        can_process_audio: bool,
        can_process_image: bool,
        fallback: str,
    ) -> str:
        try:
            data, ct = await self._downloader.download(media_url)
        except Exception:
            logger.exception("media.download_failed")
            return fallback

        if content_type == "audio" and can_process_audio:
            try:
                transcription = await self._stt.transcribe(company_id=company_id, audio_bytes=data)
                await self._msg_repo.set_media_enrichment(message_id=message_id, audio_transcription=transcription)
                return transcription
            except Exception:
                logger.exception("media.stt_failed")
                return fallback

        if content_type == "image" and can_process_image:
            try:
                description = await self._vision.describe(company_id=company_id, image_bytes=data, mime_type=ct)
                await self._msg_repo.set_media_enrichment(message_id=message_id, image_description=description)
                return description
            except Exception:
                logger.exception("media.vision_failed")
                return fallback

        return fallback

    async def _publish_lead_created(
        self,
        *,
        company_id: str,
        lead_id: str,
        channel: str,
        correlation_id: str,
        causation_id: str | None,
    ) -> None:
        event = build_envelope(
            type="lead.created",
            company_id=company_id,
            source="agent-runtime",
            correlation_id=correlation_id,
            causation_id=causation_id,
            payload={"lead_id": lead_id, "company_id": company_id, "channel": channel, "source": "unknown"},
        )
        DOMAIN_EVENTS_TOTAL.labels(type="lead.created").inc()
        await self._redis.publish("lead.created", json.dumps(event, ensure_ascii=False))

    async def _publish_debounce_timer(
        self,
        *,
        company_id: str,
        conversation_id: str,
        lead_id: str,
        instance_id: str | None,
        debounce_until: datetime,
        pending_count: int,
        correlation_id: str,
        causation_id: str | None,
    ) -> None:
        event = build_envelope(
            type="debounce.timer",
            company_id=company_id,
            source="agent-runtime",
            correlation_id=correlation_id,
            causation_id=causation_id,
            payload={
                "conversation_id": conversation_id,
                "lead_id": lead_id,
                "instance_id": instance_id,
                "debounce_until": debounce_until.isoformat(),
                "pending_count": pending_count,
            },
        )
        DOMAIN_EVENTS_TOTAL.labels(type="debounce.timer").inc()
        await self._redis.publish("debounce.timer", json.dumps(event, ensure_ascii=False))
