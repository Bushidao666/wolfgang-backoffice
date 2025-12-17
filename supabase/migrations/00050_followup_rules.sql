create table if not exists core.followup_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  centurion_id uuid not null references core.centurion_configs(id) on delete cascade,

  name text not null,
  inactivity_hours int not null default 24,
  template text not null,
  max_attempts int not null default 1,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (centurion_id, name)
);

create index if not exists idx_followup_rules_company on core.followup_rules(company_id);
create index if not exists idx_followup_rules_centurion on core.followup_rules(centurion_id);

drop trigger if exists set_updated_at on core.followup_rules;
create trigger set_updated_at
before update on core.followup_rules
for each row execute function core.set_updated_at();

alter table core.followup_rules enable row level security;

drop policy if exists followup_rules_read on core.followup_rules;
create policy followup_rules_read
  on core.followup_rules
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists followup_rules_write on core.followup_rules;
create policy followup_rules_write
  on core.followup_rules
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.followup_rules cascade;

