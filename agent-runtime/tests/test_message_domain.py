from modules.centurion.domain.message import Message


def test_as_prompt_text_prefers_content_then_enrichments():
    base = dict(
        id="m1",
        conversation_id="c1",
        company_id="co1",
        lead_id="l1",
        direction="inbound",
        content_type="text",
    )

    assert Message(**base, content="oi").as_prompt_text == "oi"
    assert Message(**base, content=None, audio_transcription="fala").as_prompt_text.startswith("[ÁUDIO]")
    assert Message(**base, content=None, image_description="uma imagem").as_prompt_text.startswith("[IMAGEM]")
    assert Message(**base, content=None).as_prompt_text == ""

