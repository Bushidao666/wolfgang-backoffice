from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from agno.db.base import AsyncBaseDb, SessionType
from agno.db.schemas.memory import UserMemory
from agno.session import AgentSession, Session

from common.infrastructure.database.supabase_client import SupabaseDb


class AgnoUserIdError(ValueError):
    pass


def build_user_id(*, company_id: str, lead_id: str) -> str:
    return f"{company_id}:{lead_id}"


def parse_user_id(user_id: str) -> tuple[str | None, str]:
    """
    Expected formats:
    - "<company_id>:<lead_id>"
    - "<lead_id>" (company_id will need to be resolved from DB)
    """
    user_id = (user_id or "").strip()
    if not user_id:
        raise AgnoUserIdError("user_id is required")

    if ":" in user_id:
        company_id, lead_id = user_id.split(":", 1)
        return (company_id.strip() or None, lead_id.strip())

    return (None, user_id)


def _epoch_s(dt: datetime | None) -> int | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


class CoreAgnoDb(AsyncBaseDb):
    """
    Minimal AsyncBaseDb implementation backed by Wolfgang core tables:

    - Storage (sessions/state/summaries): `core.conversations.metadata->'agno_session'`
    - User memories: `core.lead_memories` rows flagged via `qualification_context->'agno'`
    """

    def __init__(self, *, db: SupabaseDb):
        super().__init__(id="wolfgang-core-agnodb")
        self._db = db

    # --- Schema version (no-op; schema managed by repo migrations) ---
    async def table_exists(self, table_name: str) -> bool:  # noqa: ARG002
        return True

    async def get_latest_schema_version(self, table_name: str) -> str:  # noqa: ARG002
        return "2.0.0"

    async def upsert_schema_version(self, table_name: str, version: str):  # noqa: ARG002
        return None

    # --- Sessions (Agent) ---
    async def delete_session(self, session_id: str) -> bool:
        res = await self._db.execute(
            """
            update core.conversations
            set metadata = coalesce(metadata, '{}'::jsonb) - 'agno_session',
                updated_at=now()
            where id=$1::uuid
              and (coalesce(metadata, '{}'::jsonb) ? 'agno_session')
            """,
            session_id,
        )
        return "UPDATE 0" not in str(res)

    async def delete_sessions(self, session_ids: List[str]) -> None:
        for sid in session_ids:
            try:
                await self.delete_session(sid)
            except Exception:
                continue

    async def get_session(
        self,
        session_id: str,
        session_type: SessionType,
        user_id: Optional[str] = None,  # noqa: ARG002
        deserialize: Optional[bool] = True,
    ) -> Optional[Union[Session, Dict[str, Any]]]:
        if session_type != SessionType.AGENT:
            return None

        row = await self._db.fetchrow(
            "select metadata->'agno_session' as agno_session from core.conversations where id=$1::uuid",
            session_id,
        )
        if not row:
            return None

        blob = row.get("agno_session")
        if not blob:
            return None

        if isinstance(blob, str):
            try:
                blob = json.loads(blob)
            except Exception:
                return None

        if not isinstance(blob, dict):
            return None

        if not deserialize:
            return dict(blob)

        session = AgentSession.from_dict(blob)
        return session

    async def get_sessions(
        self,
        session_type: Optional[SessionType] = None,  # noqa: ARG002
        user_id: Optional[str] = None,  # noqa: ARG002
        component_id: Optional[str] = None,  # noqa: ARG002
        session_name: Optional[str] = None,  # noqa: ARG002
        start_timestamp: Optional[int] = None,  # noqa: ARG002
        end_timestamp: Optional[int] = None,  # noqa: ARG002
        limit: Optional[int] = None,  # noqa: ARG002
        page: Optional[int] = None,  # noqa: ARG002
        sort_by: Optional[str] = None,  # noqa: ARG002
        sort_order: Optional[str] = None,  # noqa: ARG002
        deserialize: Optional[bool] = True,  # noqa: ARG002
    ) -> Union[List[Session], Tuple[List[Dict[str, Any]], int]]:
        return [], 0

    async def rename_session(
        self,
        session_id: str,
        session_type: SessionType,
        session_name: str,
        deserialize: Optional[bool] = True,
    ) -> Optional[Union[Session, Dict[str, Any]]]:
        if session_type != SessionType.AGENT:
            return None

        await self._db.execute(
            """
            update core.conversations
            set
              metadata = jsonb_set(
                coalesce(metadata, '{}'::jsonb),
                '{agno_session,session_data,session_name}',
                to_jsonb($2::text),
                true
              ),
              updated_at=now()
            where id=$1::uuid
              and (coalesce(metadata, '{}'::jsonb) ? 'agno_session')
            """,
            session_id,
            session_name,
        )
        return await self.get_session(session_id, session_type, deserialize=deserialize)

    async def upsert_session(
        self, session: Session, deserialize: Optional[bool] = True
    ) -> Optional[Union[Session, Dict[str, Any]]]:
        if not isinstance(session, AgentSession):
            return None

        data = session.to_dict()
        # Keep storage bounded: we persist summary + session_state, but not runs history.
        data["runs"] = None

        await self._db.execute(
            """
            update core.conversations
            set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('agno_session', $2::jsonb),
                updated_at=now()
            where id=$1::uuid
            """,
            session.session_id,
            json.dumps(data, ensure_ascii=False),
        )

        if not deserialize:
            return dict(data)
        return session

    # --- Memory (UserMemories) ---
    async def clear_memories(self) -> None:
        # Intentionally a no-op: clearing all memories globally is too destructive.
        return None

    async def delete_user_memory(self, memory_id: str, user_id: Optional[str] = None) -> None:
        if not user_id:
            return
        company_id, lead_id = parse_user_id(user_id)
        if not company_id:
            row = await self._db.fetchrow("select company_id from core.leads where id=$1::uuid", lead_id)
            company_id = str(row["company_id"]) if row and row.get("company_id") else None
        if not company_id:
            return

        await self._db.execute(
            """
            delete from core.lead_memories
            where id=$1::uuid and company_id=$2::uuid and lead_id=$3::uuid
              and (coalesce(qualification_context, '{}'::jsonb) ? 'agno')
            """,
            memory_id,
            company_id,
            lead_id,
        )

    async def delete_user_memories(self, memory_ids: List[str], user_id: Optional[str] = None) -> None:
        for mid in memory_ids:
            try:
                await self.delete_user_memory(mid, user_id=user_id)
            except Exception:
                continue

    async def get_all_memory_topics(self, user_id: Optional[str] = None) -> List[str]:
        if not user_id:
            return []
        company_id, lead_id = parse_user_id(user_id)
        if not company_id:
            row = await self._db.fetchrow("select company_id from core.leads where id=$1::uuid", lead_id)
            company_id = str(row["company_id"]) if row and row.get("company_id") else None
        if not company_id:
            return []

        rows = await self._db.fetch(
            """
            select distinct jsonb_array_elements_text(coalesce(qualification_context->'agno'->'topics', '[]'::jsonb)) as topic
            from core.lead_memories
            where company_id=$1::uuid and lead_id=$2::uuid
              and (coalesce(qualification_context, '{}'::jsonb) ? 'agno')
            """,
            company_id,
            lead_id,
        )
        topics = [str(r.get("topic")) for r in rows or [] if r.get("topic")]
        return [t for t in topics if t]

    async def get_user_memory(
        self,
        memory_id: str,
        deserialize: Optional[bool] = True,
        user_id: Optional[str] = None,
    ) -> Optional[Union[UserMemory, Dict[str, Any]]]:
        if not user_id:
            return None
        company_id, lead_id = parse_user_id(user_id)
        if not company_id:
            row = await self._db.fetchrow("select company_id from core.leads where id=$1::uuid", lead_id)
            company_id = str(row["company_id"]) if row and row.get("company_id") else None
        if not company_id:
            return None

        row = await self._db.fetchrow(
            """
            select id, summary, qualification_context, created_at, last_updated_at
            from core.lead_memories
            where id=$1::uuid and company_id=$2::uuid and lead_id=$3::uuid
              and (coalesce(qualification_context, '{}'::jsonb) ? 'agno')
            """,
            memory_id,
            company_id,
            lead_id,
        )
        if not row:
            return None
        mem = self._row_to_user_memory(row, user_id=user_id)
        return mem if deserialize else mem.to_dict()

    async def get_user_memories(
        self,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        team_id: Optional[str] = None,
        topics: Optional[List[str]] = None,
        search_content: Optional[str] = None,
        limit: Optional[int] = None,
        page: Optional[int] = None,  # noqa: ARG002
        sort_by: Optional[str] = None,  # noqa: ARG002
        sort_order: Optional[str] = None,  # noqa: ARG002
        deserialize: Optional[bool] = True,
    ) -> Union[List[UserMemory], Tuple[List[Dict[str, Any]], int]]:
        if not user_id:
            return []

        company_id, lead_id = parse_user_id(user_id)
        if not company_id:
            row = await self._db.fetchrow("select company_id from core.leads where id=$1::uuid", lead_id)
            company_id = str(row["company_id"]) if row and row.get("company_id") else None
        if not company_id:
            return []

        where = [
            "company_id=$1::uuid",
            "lead_id=$2::uuid",
            "(coalesce(qualification_context, '{}'::jsonb) ? 'agno')",
        ]
        args: list[Any] = [company_id, lead_id]

        if agent_id:
            where.append("(qualification_context->'agno'->>'agent_id') = $3")
            args.append(agent_id)
        if team_id:
            where.append(f"(qualification_context->'agno'->>'team_id') = ${len(args) + 1}")
            args.append(team_id)
        if search_content:
            where.append(f"(summary ilike ${len(args) + 1})")
            args.append(f"%{search_content}%")

        # Topic filtering: require that at least one topic matches.
        if topics:
            where.append(
                f"(qualification_context->'agno'->'topics') ?| ${len(args) + 1}::text[]"
            )
            args.append(list(topics))

        lim = max(1, int(limit or 50))
        rows = await self._db.fetch(
            f"""
            select id, summary, qualification_context, created_at, last_updated_at
            from core.lead_memories
            where {' and '.join(where)}
            order by last_updated_at desc nulls last, created_at desc
            limit {lim}
            """,
            *args,
        )

        memories = [self._row_to_user_memory(r, user_id=user_id) for r in rows or []]
        if not deserialize:
            return [m.to_dict() for m in memories]
        return memories

    async def get_user_memory_stats(
        self,
        limit: Optional[int] = None,  # noqa: ARG002
        page: Optional[int] = None,  # noqa: ARG002
        user_id: Optional[str] = None,  # noqa: ARG002
    ) -> Tuple[List[Dict[str, Any]], int]:
        return [], 0

    async def upsert_user_memory(
        self, memory: UserMemory, deserialize: Optional[bool] = True
    ) -> Optional[Union[UserMemory, Dict[str, Any]]]:
        user_id = memory.user_id
        if not user_id:
            return None

        company_id, lead_id = parse_user_id(user_id)
        if not company_id:
            row = await self._db.fetchrow("select company_id from core.leads where id=$1::uuid", lead_id)
            company_id = str(row["company_id"]) if row and row.get("company_id") else None
        if not company_id:
            return None

        # Ensure UUID memory_id (lead_memories PK is uuid).
        try:
            memory_id = str(uuid.UUID(str(memory.memory_id))) if memory.memory_id else str(uuid.uuid4())
        except Exception:
            memory_id = str(uuid.uuid4())
        memory.memory_id = memory_id

        agno_ctx = {
            "agno": {
                "topics": list(memory.topics or []),
                "input": memory.input,
                "agent_id": memory.agent_id,
                "team_id": memory.team_id,
                "feedback": memory.feedback,
            }
        }

        await self._db.execute(
            """
            insert into core.lead_memories (id, company_id, lead_id, summary, qualification_context, last_updated_at)
            values ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb, now())
            on conflict (id) do update set
              company_id=excluded.company_id,
              lead_id=excluded.lead_id,
              summary=excluded.summary,
              qualification_context=excluded.qualification_context,
              last_updated_at=now()
            """,
            memory_id,
            company_id,
            lead_id,
            memory.memory,
            json.dumps(agno_ctx, ensure_ascii=False),
        )

        return memory if deserialize else memory.to_dict()

    def _row_to_user_memory(self, row: Any, *, user_id: str) -> UserMemory:
        ctx = dict(row.get("qualification_context") or {})
        agno = dict(ctx.get("agno") or {})
        return UserMemory(
            memory=str(row.get("summary") or ""),
            memory_id=str(row.get("id")),
            topics=list(agno.get("topics") or []),
            user_id=user_id,
            input=agno.get("input"),
            feedback=agno.get("feedback"),
            agent_id=agno.get("agent_id"),
            team_id=agno.get("team_id"),
            created_at=_epoch_s(row.get("created_at")),
            updated_at=_epoch_s(row.get("last_updated_at")),
        )

    # --- Unused components (not implemented for runtime) ---
    async def get_metrics(
        self,
        starting_date: Optional[date] = None,  # noqa: ARG002
        ending_date: Optional[date] = None,  # noqa: ARG002
    ) -> Tuple[List[Dict[str, Any]], Optional[int]]:
        raise NotImplementedError

    async def calculate_metrics(self) -> Optional[Any]:
        raise NotImplementedError

    async def delete_knowledge_content(self, id: str):  # noqa: ARG002
        raise NotImplementedError

    async def get_knowledge_content(self, id: str):  # noqa: ARG002
        raise NotImplementedError

    async def get_knowledge_contents(
        self,
        limit: Optional[int] = None,  # noqa: ARG002
        page: Optional[int] = None,  # noqa: ARG002
        sort_by: Optional[str] = None,  # noqa: ARG002
        sort_order: Optional[str] = None,  # noqa: ARG002
    ):
        raise NotImplementedError

    async def upsert_knowledge_content(self, knowledge_row):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def create_eval_run(self, eval_run):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def delete_eval_runs(self, eval_run_ids: List[str]):  # noqa: ARG002
        raise NotImplementedError

    async def get_eval_run(self, eval_run_id: str, deserialize: Optional[bool] = True):  # noqa: ARG002
        raise NotImplementedError

    async def get_eval_runs(self, *args, **kwargs):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def rename_eval_run(self, eval_run_id: str, name: str, deserialize: Optional[bool] = True):  # noqa: ARG002
        raise NotImplementedError

    async def upsert_trace(self, trace) -> None:  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def get_trace(self, *args, **kwargs):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def get_traces(self, *args, **kwargs):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def get_trace_stats(self, *args, **kwargs):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def create_span(self, span) -> None:  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def create_spans(self, spans: List) -> None:  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def get_span(self, span_id: str):  # noqa: ARG002
        raise NotImplementedError

    async def get_spans(self, *args, **kwargs):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def clear_cultural_knowledge(self) -> None:
        raise NotImplementedError

    async def delete_cultural_knowledge(self, id: str) -> None:  # noqa: ARG002
        raise NotImplementedError

    async def get_cultural_knowledge(self, id: str, deserialize: Optional[bool] = True):  # noqa: ARG002
        raise NotImplementedError

    async def get_all_cultural_knowledge(self, *args, **kwargs):  # noqa: ANN001, ARG002
        raise NotImplementedError

    async def upsert_cultural_knowledge(self, cultural_knowledge, deserialize: Optional[bool] = True):  # noqa: ANN001, ARG002
        raise NotImplementedError
