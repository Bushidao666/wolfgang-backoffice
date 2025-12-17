create table if not exists core.lead_memories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  lead_id uuid not null references core.leads(id) on delete cascade,

  facts jsonb default '[]'::jsonb,
  preferences jsonb default '{}'::jsonb,
  embeddings vector(1536),
  summary text,
  qualification_context jsonb default '{}'::jsonb,

  last_updated_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_memories_lead on core.lead_memories(lead_id);

-- Down (manual):
-- drop table if exists core.lead_memories cascade;
