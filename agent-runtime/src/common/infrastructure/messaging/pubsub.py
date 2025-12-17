import asyncio
import logging
from collections.abc import Awaitable, Callable

from tenacity import AsyncRetrying, stop_after_attempt, wait_exponential

from common.infrastructure.cache.redis_client import RedisClient

logger = logging.getLogger(__name__)

Handler = Callable[[str], Awaitable[None]]


class RedisPubSubSubscriber:
    def __init__(self, redis: RedisClient):
        self._redis = redis
        self._handlers: dict[str, Handler] = {}
        self._pubsub = None

    def register(self, channel: str, handler: Handler) -> None:
        self._handlers[channel] = handler

    async def run_forever(self) -> None:
        if not self._handlers:
            logger.warning("pubsub.no_handlers")
            await asyncio.Future()
            return

        self._pubsub = self._redis.client.pubsub()
        await self._pubsub.subscribe(*self._handlers.keys())
        logger.info("pubsub.subscribed", extra={"extra": {"channels": list(self._handlers.keys())}})

        async for msg in self._pubsub.listen():
            if msg is None or msg.get("type") != "message":
                continue
            channel = msg.get("channel")
            data = msg.get("data")
            if not isinstance(channel, str) or not isinstance(data, str):
                continue

            handler = self._handlers.get(channel)
            if not handler:
                continue

            try:
                async for attempt in AsyncRetrying(
                    stop=stop_after_attempt(3),
                    wait=wait_exponential(min=0.2, max=2.0),
                    reraise=True,
                ):
                    with attempt:
                        await handler(data)
            except Exception:
                logger.exception("pubsub.handler_failed", extra={"extra": {"channel": channel}})

    async def close(self) -> None:
        if self._pubsub:
            try:
                await self._pubsub.close()
            finally:
                self._pubsub = None

