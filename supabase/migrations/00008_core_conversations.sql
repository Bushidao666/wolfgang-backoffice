create table if not exists core.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  lead_id uuid not null references core.leads(id) on delete cascade,
  centurion_id uuid not null references core.centurion_configs(id),
  channel_instance_id uuid references core.channel_instances(id),

  channel_type core.channel_type not null,

  debounce_state text default 'idle' check (debounce_state in ('idle', 'waiting', 'ready', 'processing', 'responding')),
  debounce_until timestamptz,
  pending_messages jsonb default '[]'::jsonb,

  agent_state text default 'idle' check (agent_state in ('idle', 'thinking', 'responding')),
  lead_state text default 'active' check (lead_state in ('active', 'waiting', 'inactive')),

  last_inbound_at timestamptz,
  last_outbound_at timestamptz,

  metadata jsonb default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_company_lead on core.conversations(company_id, lead_id);
create index if not exists idx_conversations_centurion on core.conversations(centurion_id);

drop trigger if exists set_updated_at on core.conversations;
create trigger set_updated_at
before update on core.conversations
for each row execute function core.set_updated_at();

-- Down (manual):
-- drop table if exists core.conversations cascade;
