from common.infrastructure.agno.memory import AgnoAgentFactory
from common.infrastructure.integrations.openai_resolver import OpenAIResolved


class _Db:
    async def fetchrow(self, query: str, *args):  # noqa: ARG002
        return None

    async def fetch(self, query: str, *args):  # noqa: ARG002
        return []

    async def execute(self, query: str, *args):  # noqa: ARG002
        return "OK"


def test_build_agent_sets_session_and_user_ids():
    factory = AgnoAgentFactory(db=_Db())  # type: ignore[arg-type]
    llm = OpenAIResolved(
        api_key="test",
        base_url="http://example.test",
        chat_model="gpt-4o-mini",
        vision_model="gpt-4o-mini",
        stt_model="whisper-1",
        embedding_model="text-embedding-3-small",
    )

    agent = factory.build_agent(
        company_id="co1",
        lead_id="l1",
        conversation_id="c1",
        centurion_id="ct1",
        llm=llm,
        system_message="Você é um SDR.",
        tools=[],
        tool_hooks=[],
        tool_call_limit=5,
    )

    assert agent.session_id == "c1"
    assert agent.user_id == "co1:l1"
    assert agent.id == "ct1"

