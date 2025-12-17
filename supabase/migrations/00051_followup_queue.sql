create table if not exists core.followup_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  lead_id uuid not null references core.leads(id) on delete cascade,
  centurion_id uuid not null references core.centurion_configs(id) on delete cascade,
  rule_id uuid references core.followup_rules(id) on delete set null,
  message_id uuid references core.messages(id) on delete set null,

  scheduled_at timestamptz not null,
  attempt_number int not null default 1,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'canceled', 'failed')),
  sent_at timestamptz,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_followup_queue_company_status_sched on core.followup_queue(company_id, status, scheduled_at);
create index if not exists idx_followup_queue_lead on core.followup_queue(lead_id);

drop trigger if exists set_updated_at on core.followup_queue;
create trigger set_updated_at
before update on core.followup_queue
for each row execute function core.set_updated_at();

alter table core.followup_queue enable row level security;

drop policy if exists followup_queue_read on core.followup_queue;
create policy followup_queue_read
  on core.followup_queue
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists followup_queue_write on core.followup_queue;
create policy followup_queue_write
  on core.followup_queue
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.followup_queue cascade;

