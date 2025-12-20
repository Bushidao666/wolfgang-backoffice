import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.routes.centurions import router as centurions_router
from api.routes.health import router as health_router
from api.routes.metrics import router as metrics_router
from common.config.logging import setup_logging
from common.config.settings import get_settings
from common.infrastructure.cache.redis_client import RedisClient
from common.infrastructure.database.connection_pool import ConnectionPool
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.messaging.pubsub import RedisPubSubSubscriber
from common.infrastructure.tracing.tracer import init_tracing
from common.middleware.logging import LoggingMiddleware
from handlers.proactive_handler import ProactiveHandler
from modules.centurion.handlers.debounce_handler import DebounceWorker
from modules.centurion.handlers.message_handler import MessageHandler
from modules.centurion.jobs.conversation_watchdog import ConversationWatchdog
from modules.memory.services.memory_cleanup import MemoryCleanupWorker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    setup_logging(service_name="agent-runtime", level=settings.log_level)
    init_tracing(app, service_name="agent-runtime")
    logger.info("startup", extra={"extra": {"env": settings.environment}})

    app.state.settings = settings
    app.state.disable_connections = settings.disable_connections
    app.state.disable_workers = settings.disable_workers
    app.state.connection_mode = "disabled" if settings.disable_connections else "connecting"

    pool = None
    db = None
    redis = None
    pubsub = None
    subscriber_task = debounce_task = proactive_task = cleanup_task = watchdog_task = None

    if not settings.disable_connections:
        try:
            pool = ConnectionPool(settings.supabase_db_url, min_size=settings.db_pool_min, max_size=settings.db_pool_max)
            await asyncio.wait_for(pool.start(), timeout=settings.connection_timeout_s)
            db = SupabaseDb(pool)

            redis = RedisClient(settings.redis_url)
            await asyncio.wait_for(redis.connect(), timeout=settings.connection_timeout_s)

            app.state.pool = pool
            app.state.db = db
            app.state.redis = redis
            app.state.connection_mode = "connected"

            pubsub = RedisPubSubSubscriber(redis)
            message_handler = MessageHandler(db=db, redis=redis)
            pubsub.register("message.received", message_handler.handle_message_received)

            debounce_worker = DebounceWorker(db=db, redis=redis)
            proactive_handler = ProactiveHandler(db=db, redis=redis)
            memory_cleanup = MemoryCleanupWorker(db=db, redis=redis)
            watchdog = ConversationWatchdog(db=db)

            if not settings.disable_workers:
                subscriber_task = asyncio.create_task(pubsub.run_forever())
                debounce_task = asyncio.create_task(debounce_worker.run_forever())
                proactive_task = asyncio.create_task(proactive_handler.run_forever())
                cleanup_task = asyncio.create_task(memory_cleanup.run_forever())
                watchdog_task = asyncio.create_task(watchdog.run_forever())
        except Exception as e:
            app.state.connection_mode = "failed"
            app.state.connection_error_type = type(e).__name__
            logger.exception("startup_connections_failed")

    try:
        yield
    finally:
        for task in (subscriber_task, debounce_task, proactive_task, cleanup_task, watchdog_task):
            if task:
                task.cancel()
        if pubsub:
            await pubsub.close()
        if redis:
            await redis.close()
        if pool:
            await pool.close()


app = FastAPI(title="Wolfgang Agent Runtime", version="0.1.0", lifespan=lifespan)
app.add_middleware(LoggingMiddleware)
app.include_router(health_router)
app.include_router(centurions_router)
app.include_router(metrics_router)
