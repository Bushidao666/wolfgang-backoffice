-- Append-only qualification evaluation history (explainability / audit).
-- Each evaluation stores score + per-criterion evidence with the config snapshot/hash used.

create table if not exists core.lead_qualification_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  lead_id uuid not null references core.leads(id) on delete cascade,

  conversation_id uuid references core.conversations(id) on delete set null,
  centurion_id uuid references core.centurion_configs(id) on delete set null,

  correlation_id text,
  causation_id text,

  -- Versioning of the qualification config used for this evaluation.
  rules_hash text not null,
  rules jsonb not null default '{}'::jsonb,

  threshold numeric not null default 1.0,
  score numeric not null default 0.0,
  is_qualified boolean not null default false,
  required_met boolean not null default false,

  -- JSON payloads kept small; evidence should be short quotes/snippets.
  criteria jsonb not null default '[]'::jsonb,
  extracted jsonb not null default '{}'::jsonb,
  summary text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  check (char_length(rules_hash) <= 128)
);

create index if not exists idx_lead_qualification_events_company_created_at
  on core.lead_qualification_events(company_id, created_at desc);

create index if not exists idx_lead_qualification_events_lead_created_at
  on core.lead_qualification_events(lead_id, created_at desc);

create index if not exists idx_lead_qualification_events_conversation_id
  on core.lead_qualification_events(conversation_id);

create index if not exists idx_lead_qualification_events_centurion_created_at
  on core.lead_qualification_events(centurion_id, created_at desc);

-- RLS: readable by authenticated users in the company; writable only by service role.
alter table core.lead_qualification_events enable row level security;

drop policy if exists lead_qualification_events_read on core.lead_qualification_events;
create policy lead_qualification_events_read
  on core.lead_qualification_events
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists lead_qualification_events_service_all on core.lead_qualification_events;
create policy lead_qualification_events_service_all
  on core.lead_qualification_events
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table core.lead_qualification_events from public;
grant select on table core.lead_qualification_events to authenticated;
grant select, insert, update, delete on table core.lead_qualification_events to service_role;

-- Down (manual):
-- drop table if exists core.lead_qualification_events cascade;
