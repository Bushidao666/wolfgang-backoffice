-- Event consumption / idempotency store.
-- Used by agent-runtime and other services to dedupe side-effects across retries and horizontal scale.

create table if not exists core.event_consumptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  consumer text not null,
  dedupe_key text not null,

  event_type text,
  event_id text,
  correlation_id text,
  causation_id text,

  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),

  check (char_length(consumer) <= 200),
  check (char_length(dedupe_key) <= 512)
);

-- Ensure idempotency is tenant-safe: avoid cross-company collisions.
create unique index if not exists ux_event_consumptions_company_consumer_dedupe
  on core.event_consumptions(company_id, consumer, dedupe_key);

create index if not exists idx_event_consumptions_expires_at
  on core.event_consumptions(expires_at);

create index if not exists idx_event_consumptions_company_expires_at
  on core.event_consumptions(company_id, expires_at);

-- RLS: internal table (service role only).
alter table core.event_consumptions enable row level security;

drop policy if exists event_consumptions_service_all on core.event_consumptions;
create policy event_consumptions_service_all
  on core.event_consumptions
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table core.event_consumptions from public;
grant select, insert, update, delete on table core.event_consumptions to service_role;

-- Down (manual):
-- drop table if exists core.event_consumptions cascade;
