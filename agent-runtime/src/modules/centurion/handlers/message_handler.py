from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.supabase_client import SupabaseDb
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

        self._downloader = MediaDownloader()
        self._stt = SpeechToTextService()
        self._vision = VisionService()
        self._channel_router = ChannelRouter()

    async def handle_message_received(self, raw: str) -> None:
        try:
            event = json.loads(raw)
        except Exception:
            logger.warning("message_received.invalid_json")
            return

        if not isinstance(event, dict) or event.get("type") != "message.received":
            return

        company_id = event.get("company_id")
        payload = event.get("payload") or {}
        if not company_id or not isinstance(payload, dict):
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
        message_id = await self._msg_repo.save_message(
            conversation_id=conversation.id,
            company_id=company_id,
            lead_id=lead.id,
            direction="inbound",
            content_type=content_type,
            content=inbound_content,
            channel_message_id=normalized.raw.get("message_id") if isinstance(normalized.raw, dict) else None,
            metadata={"event_id": event.get("id"), "raw": normalized.raw or {}},
        )
        MESSAGES_TOTAL.labels(direction="inbound", channel_type=channel_type, content_type=content_type).inc()
        await self._lead_repo.touch_inbound(company_id=company_id, lead_id=lead.id)
        await self._short_term.invalidate_cache(conversation.id)

        enriched_text = inbound_content or ""
        if media_url:
            enriched_text = await self._process_media(
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
                correlation_id=event.get("correlation_id") or lead.id,
            )

        debounce_ms = int(config.get("debounce_wait_ms") or 3000)
        until = datetime.now(timezone.utc) + timedelta(milliseconds=debounce_ms)
        pending = list(conversation.pending_messages or [])
        pending.append(enriched_text or "")

        await self._conv_repo.update_debounce(
            conversation_id=conversation.id,
            state="waiting",
            until=until,
            pending_messages=pending,
            last_inbound_at=datetime.now(timezone.utc),
        )
        await self._publish_debounce_timer(
            company_id=company_id,
            conversation_id=conversation.id,
            lead_id=lead.id,
            instance_id=instance_id,
            debounce_until=until,
            pending_count=len(pending),
            correlation_id=event.get("correlation_id") or str(message_id),
            causation_id=event.get("id"),
        )

    async def _process_media(
        self,
        *,
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
                transcription = await self._stt.transcribe(audio_bytes=data)
                await self._msg_repo.set_media_enrichment(message_id=message_id, audio_transcription=transcription)
                return transcription
            except Exception:
                logger.exception("media.stt_failed")
                return fallback

        if content_type == "image" and can_process_image:
            try:
                description = await self._vision.describe(image_bytes=data, mime_type=ct)
                await self._msg_repo.set_media_enrichment(message_id=message_id, image_description=description)
                return description
            except Exception:
                logger.exception("media.vision_failed")
                return fallback

        return fallback

    async def _publish_lead_created(self, *, company_id: str, lead_id: str, channel: str, correlation_id: str) -> None:
        event = {
            "id": str(uuid.uuid4()),
            "type": "lead.created",
            "version": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "company_id": company_id,
            "source": "agent-runtime",
            "correlation_id": correlation_id,
            "causation_id": None,
            "payload": {"lead_id": lead_id, "company_id": company_id, "channel": channel, "source": "unknown"},
        }
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
        event = {
            "id": str(uuid.uuid4()),
            "type": "debounce.timer",
            "version": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "company_id": company_id,
            "source": "agent-runtime",
            "correlation_id": correlation_id,
            "causation_id": causation_id,
            "payload": {
                "conversation_id": conversation_id,
                "lead_id": lead_id,
                "instance_id": instance_id,
                "debounce_until": debounce_until.isoformat(),
                "pending_count": pending_count,
            },
        }
        await self._redis.publish("debounce.timer", json.dumps(event, ensure_ascii=False))
