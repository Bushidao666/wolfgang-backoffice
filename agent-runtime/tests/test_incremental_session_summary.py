import pytest

from agno.run.agent import Message
from agno.session.summary import SessionSummary, SessionSummaryResponse

from common.infrastructure.agno.summary import IncrementalSessionSummaryManager


class _ModelResponse:
    def __init__(self, *, parsed=None, content=None):  # noqa: ANN001
        self.parsed = parsed
        self.content = content


class _StubModel:
    supports_native_structured_outputs = True
    supports_json_schema_outputs = False

    def response(self, *, messages, response_format):  # noqa: ANN001, ARG002
        return _ModelResponse(parsed=SessionSummaryResponse(summary="new summary", topics=["a"]))

    async def aresponse(self, *, messages, response_format):  # noqa: ANN001, ARG002
        return _ModelResponse(parsed=SessionSummaryResponse(summary="new summary async", topics=["b"]))


class _StubJsonSchemaModel:
    supports_native_structured_outputs = False
    supports_json_schema_outputs = True


class _Session:
    def __init__(self, *, summary: SessionSummary | None):
        self.summary = summary

    def get_messages(self):  # noqa: ANN001
        return [
            Message(role="user", content="hi"),
            Message(role="assistant", content="hello"),
        ]


def test_get_system_message_includes_previous_summary():
    mgr = IncrementalSessionSummaryManager(model=None)
    msg = mgr.get_system_message(
        conversation=[
            Message(role="user", content="hi"),
            Message(role="assistant", content="hello"),
        ],
        previous_summary=SessionSummary(summary="prev summary"),
        response_format={"type": "json_object"},
    )
    assert "prev summary" in str(msg.content)


def test_get_response_format_supports_json_schema():
    mgr = IncrementalSessionSummaryManager(model=None)
    fmt = mgr.get_response_format(_StubJsonSchemaModel())  # type: ignore[arg-type]
    assert isinstance(fmt, dict)
    assert fmt.get("type") == "json_schema"


def test_get_system_message_uses_custom_prompt_and_formats_media():
    mgr = IncrementalSessionSummaryManager(model=None, session_summary_prompt="CUSTOM")
    user = Message(role="user", content="")
    user.images = [object()]  # type: ignore[attr-defined]

    msg = mgr.get_system_message(
        conversation=[user, Message(role="assistant", content="ok")],
        previous_summary=None,
        response_format={"type": "json_object"},
    )
    content = str(msg.content)
    assert content.startswith("CUSTOM")
    assert "Provided 1 image(s)" in content
    assert "<previous_summary>" in content


def test_process_summary_response_parses_string_content():
    mgr = IncrementalSessionSummaryManager(model=None)
    resp = _ModelResponse(parsed=None, content='{"summary":"s","topics":["t"]}')
    out = mgr._process_summary_response(  # noqa: SLF001
        resp,
        session_summary_model=type("M", (), {"supports_native_structured_outputs": False})(),
    )
    assert out and out.summary == "s"


def test_create_session_summary_returns_none_without_model(monkeypatch):
    mgr = IncrementalSessionSummaryManager(model=None)
    monkeypatch.setattr("common.infrastructure.agno.summary.get_model", lambda _: None)
    assert mgr.create_session_summary(_Session(summary=None)) is None


def test_create_session_summary_updates_session_summary(monkeypatch):
    mgr = IncrementalSessionSummaryManager(model=object())  # placeholder; patched below
    monkeypatch.setattr("common.infrastructure.agno.summary.get_model", lambda _: _StubModel())

    session = _Session(summary=SessionSummary(summary="prev"))
    out = mgr.create_session_summary(session)

    assert out and out.summary == "new summary"
    assert session.summary and session.summary.summary == "new summary"
    assert mgr.summaries_updated is True


@pytest.mark.asyncio
async def test_acreate_session_summary_updates_session_summary(monkeypatch):
    mgr = IncrementalSessionSummaryManager(model=object())  # placeholder; patched below
    monkeypatch.setattr("common.infrastructure.agno.summary.get_model", lambda _: _StubModel())

    session = _Session(summary=SessionSummary(summary="prev"))
    out = await mgr.acreate_session_summary(session)

    assert out and out.summary == "new summary async"
    assert session.summary and session.summary.summary == "new summary async"
    assert mgr.summaries_updated is True
