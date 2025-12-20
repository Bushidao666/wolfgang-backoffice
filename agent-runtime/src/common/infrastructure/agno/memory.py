from __future__ import annotations

from agno.agent import Agent
from agno.memory import MemoryManager

from common.infrastructure.agno.storage import CoreAgnoDb, build_user_id
from common.infrastructure.agno.summary import IncrementalSessionSummaryManager
from common.infrastructure.database.supabase_client import SupabaseDb
from common.infrastructure.integrations.openai_resolver import OpenAIResolved


class AgnoAgentFactory:
    """
    Builds Agno Agents configured with:
    - Storage (core.conversations metadata)
    - User memories (core.lead_memories with agno marker)
    - Session summaries (stored in the session blob)
    """

    def __init__(self, *, db: SupabaseDb):
        self._db = db
        self._agno_db = CoreAgnoDb(db=db)

    def build_agent(
        self,
        *,
        company_id: str,
        lead_id: str,
        conversation_id: str,
        centurion_id: str,
        llm: OpenAIResolved,
        system_message: str,
        tools: list | None = None,
        tool_hooks: list | None = None,
        tool_call_limit: int = 8,
    ) -> Agent:
        from agno.models.openai import OpenAIChat

        model = OpenAIChat(
            id=llm.chat_model,
            api_key=llm.api_key,
            base_url=llm.base_url,
            temperature=0.3,
            timeout=30.0,
        )

        memory_manager = MemoryManager(
            model=model,
            db=self._agno_db,
            delete_memories=False,
            clear_memories=False,
            update_memories=True,
            add_memories=True,
        )

        summary_manager = IncrementalSessionSummaryManager(model=model)

        if tool_hooks is None:
            tool_hooks = self.default_tool_hooks()

        return Agent(
            id=centurion_id,
            user_id=build_user_id(company_id=company_id, lead_id=lead_id),
            session_id=conversation_id,
            db=self._agno_db,
            memory_manager=memory_manager,
            enable_user_memories=True,
            add_memories_to_context=True,
            enable_session_summaries=True,
            add_session_summary_to_context=True,
            session_summary_manager=summary_manager,
            model=model,
            system_message=system_message,
            tools=tools or None,
            tool_hooks=tool_hooks or None,
            tool_call_limit=tool_call_limit,
            build_context=True,
            telemetry=False,
            debug_mode=False,
            # Keep our canonical history in core.messages; do not persist full run histories in session blobs.
            store_history_messages=False,
            store_tool_messages=False,
            store_media=False,
            store_events=False,
        )

    def default_tool_hooks(self) -> list:
        from modules.tools.agno_hooks.audit_hooks import make_tool_audit_hook
        from modules.tools.agno_hooks.logging_hooks import tool_logging_hook
        from modules.tools.agno_hooks.security_hooks import payload_limits_hook

        return [
            payload_limits_hook,
            tool_logging_hook,
            make_tool_audit_hook(db=self._db),
        ]
