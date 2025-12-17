from modules.centurion.services.response_builder import ChunkConfig, ResponseBuilder


def test_split_into_chunks_returns_empty_for_blank():
    builder = ResponseBuilder()
    assert builder.split_into_chunks("", ChunkConfig(enabled=True, max_chars=10)) == []
    assert builder.split_into_chunks("   \n\t", ChunkConfig(enabled=True, max_chars=10)) == []


def test_split_into_chunks_returns_single_when_disabled_or_short():
    builder = ResponseBuilder()
    cfg = ChunkConfig(enabled=False, max_chars=10)
    assert builder.split_into_chunks("  Olá   mundo  ", cfg) == ["Olá mundo"]

    cfg2 = ChunkConfig(enabled=True, max_chars=50)
    assert builder.split_into_chunks("Olá mundo", cfg2) == ["Olá mundo"]


def test_split_into_chunks_splits_on_sentence_boundaries():
    builder = ResponseBuilder()
    cfg = ChunkConfig(enabled=True, max_chars=20)
    text = "Olá. Tudo bem? Vamos testar!"
    chunks = builder.split_into_chunks(text, cfg)

    assert chunks
    assert all(len(c) <= cfg.max_chars for c in chunks)
    assert "Olá." in chunks[0]


def test_split_into_chunks_hard_splits_long_sentence():
    builder = ResponseBuilder()
    cfg = ChunkConfig(enabled=True, max_chars=10)
    chunks = builder.split_into_chunks("x" * 35, cfg)

    assert len(chunks) == 4
    assert all(len(c) <= 10 for c in chunks)

