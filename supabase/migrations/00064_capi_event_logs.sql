create table if not exists core.capi_event_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  pixel_id text not null,

  -- Evento (Meta CAPI)
  event_name text not null,
  event_time timestamptz not null,
  event_payload jsonb not null,

  -- Status
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'retrying')),
  attempts int not null default 0,
  last_attempt_at timestamptz,

  -- Resposta
  fb_trace_id text,
  error_message text,
  error_code text,

  -- Metadata (origem do evento interno)
  source_event text,
  source_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_capi_logs_company on core.capi_event_logs(company_id);
create index if not exists idx_capi_logs_status on core.capi_event_logs(status);
create index if not exists idx_capi_logs_pixel on core.capi_event_logs(pixel_id);
create index if not exists idx_capi_logs_created on core.capi_event_logs(created_at);
create unique index if not exists idx_capi_logs_dedupe
  on core.capi_event_logs(company_id, source_event, source_id, event_name);

drop trigger if exists set_updated_at on core.capi_event_logs;
create trigger set_updated_at
before update on core.capi_event_logs
for each row execute function core.set_updated_at();

alter table core.capi_event_logs enable row level security;

drop policy if exists capi_event_logs_read on core.capi_event_logs;
create policy capi_event_logs_read
  on core.capi_event_logs
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists capi_event_logs_write on core.capi_event_logs;
create policy capi_event_logs_write
  on core.capi_event_logs
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.capi_event_logs cascade;

