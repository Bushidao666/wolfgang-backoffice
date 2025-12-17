from common.config.settings import get_settings

settings = get_settings()

OPENAI_BASE_URL = settings.openai_base_url
OPENAI_CHAT_MODEL = settings.openai_chat_model
OPENAI_VISION_MODEL = settings.openai_vision_model
OPENAI_STT_MODEL = settings.openai_stt_model

