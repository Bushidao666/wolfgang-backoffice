create table if not exists core.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references core.conversations(id) on delete cascade,
  company_id uuid not null references core.companies(id) on delete cascade,
  lead_id uuid not null references core.leads(id) on delete cascade,

  direction text not null check (direction in ('inbound', 'outbound')),
  content_type text not null check (content_type in ('text', 'audio', 'image', 'video', 'document')),
  content text,

  audio_transcription text,
  image_description text,

  channel_message_id text,
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on core.messages(conversation_id);
create index if not exists idx_messages_lead on core.messages(lead_id);
create index if not exists idx_messages_company_created_at on core.messages(company_id, created_at desc);

-- Down (manual):
-- drop table if exists core.messages cascade;
