import pytest

from modules.centurion.handlers.debounce_handler import DebounceWorker


class _Conv:
    def __init__(self, id: str):
        self.id = id


@pytest.mark.asyncio
async def test_tick_no_due_conversations_noops():
    worker = DebounceWorker(db=object(), redis=object())  # type: ignore[arg-type]
    async def find_due_conversations(limit: int = 20):  # noqa: ARG001
        return []

    worker._conversations = type("R", (), {"find_due_conversations": staticmethod(find_due_conversations)})()  # type: ignore[attr-defined]

    called = {"count": 0}

    async def process_due_conversation(conversation_id: str, *, causation_id: str | None = None):  # noqa: ARG001
        called["count"] += 1

    worker._centurion = type("C", (), {"process_due_conversation": staticmethod(process_due_conversation)})()  # type: ignore[attr-defined]

    await worker._tick()  # noqa: SLF001
    assert called["count"] == 0


@pytest.mark.asyncio
async def test_tick_processes_each_due_conversation():
    worker = DebounceWorker(db=object(), redis=object())  # type: ignore[arg-type]

    async def find_due_conversations(limit: int = 20):  # noqa: ARG001
        return [_Conv("c1"), _Conv("c2")]

    worker._conversations = type("R", (), {"find_due_conversations": staticmethod(find_due_conversations)})()  # type: ignore[attr-defined]

    seen: list[tuple[str, str | None]] = []

    async def process_due_conversation(conversation_id: str, *, causation_id: str | None = None):
        seen.append((conversation_id, causation_id))

    worker._centurion = type("C", (), {"process_due_conversation": staticmethod(process_due_conversation)})()  # type: ignore[attr-defined]

    await worker._tick()  # noqa: SLF001
    assert seen == [("c1", "c1"), ("c2", "c2")]
