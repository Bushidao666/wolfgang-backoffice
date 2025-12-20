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


def test_extract_media_plan_parses_media_code_block_and_cleans_text():
    builder = ResponseBuilder()
    raw = "Olá!\n\n```media\n[{\"asset_id\":\"a1\",\"type\":\"image\",\"caption\":\"Veja\"}]\n```\n"
    cleaned, plan = builder.extract_media_plan(raw)

    assert "```media" not in cleaned
    assert cleaned.strip() == "Olá!"
    assert plan == [{"asset_id": "a1", "type": "image", "caption": "Veja"}]


def test_extract_media_plan_returns_original_text_on_invalid_json():
    builder = ResponseBuilder()
    raw = "Olá\n```media\n{not-json}\n```\n"
    cleaned, plan = builder.extract_media_plan(raw)

    assert "```media" not in cleaned
    assert cleaned.strip() == "Olá"
    assert plan == []


def test_build_outbound_messages_appends_media_after_text_chunks():
    builder = ResponseBuilder()
    cfg = ChunkConfig(enabled=True, max_chars=10)
    messages = builder.build_outbound_messages(
        text="Olá mundo. Tudo bem?",
        chunk_config=cfg,
        media_plan=[{"asset_id": "a1", "type": "document", "caption": "PDF"}],
    )

    assert messages
    assert any(m.get("type") == "text" for m in messages)
    assert messages[-1]["type"] == "document"
    assert messages[-1]["asset_id"] == "a1"
