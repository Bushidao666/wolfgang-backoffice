from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    environment: str = Field(default="development", alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")

    supabase_db_url: str = Field(
        default="postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        alias="SUPABASE_DB_URL",
    )
    db_pool_min: int = Field(default=1, alias="DB_POOL_MIN")
    db_pool_max: int = Field(default=5, alias="DB_POOL_MAX")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")
    openai_chat_model: str = Field(default="gpt-4o-mini", alias="OPENAI_CHAT_MODEL")
    openai_vision_model: str = Field(default="gpt-4o-mini", alias="OPENAI_VISION_MODEL")
    openai_stt_model: str = Field(default="whisper-1", alias="OPENAI_STT_MODEL")
    openai_embedding_model: str = Field(default="text-embedding-3-small", alias="OPENAI_EMBEDDING_MODEL")

    media_download_timeout_s: float = Field(default=20.0, alias="MEDIA_DOWNLOAD_TIMEOUT_S")

    debounce_poll_interval_s: float = Field(default=0.5, alias="DEBOUNCE_POLL_INTERVAL_S")
    followup_poll_interval_s: float = Field(default=30.0, alias="FOLLOWUP_POLL_INTERVAL_S")
    cleanup_interval_s: float = Field(default=3600.0, alias="MEMORY_CLEANUP_INTERVAL_S")

    disable_connections: bool = Field(default=False, alias="DISABLE_CONNECTIONS")
    disable_workers: bool = Field(default=False, alias="DISABLE_WORKERS")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
