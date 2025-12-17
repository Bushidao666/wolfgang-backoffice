-- Adiciona campo media_url à tabela core.messages
-- Complementa a migration 00009 para armazenar URLs de mídias enviadas

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'core' and table_name = 'messages' and column_name = 'media_url'
  ) then
    alter table core.messages add column media_url text;
  end if;
end $$;

comment on column core.messages.content is 'Texto da mensagem ou URL temporária da mídia';
comment on column core.messages.media_url is 'URL permanente da mídia (se aplicável, ex: Storage)';
comment on column core.messages.audio_transcription is 'Transcrição do áudio processada via STT (Speech-to-Text)';
comment on column core.messages.image_description is 'Descrição da imagem processada via Vision API';

-- Down (manual):
-- alter table core.messages drop column if exists media_url;
