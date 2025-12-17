create table if not exists core.deals_index (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  schema_name text not null,
  local_deal_id uuid not null,

  status text,
  value numeric,
  opened_at timestamptz,
  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (schema_name, local_deal_id)
);

create index if not exists idx_deals_index_company on core.deals_index(company_id);
create index if not exists idx_deals_index_company_status on core.deals_index(company_id, status);

drop trigger if exists set_updated_at on core.deals_index;
create trigger set_updated_at
before update on core.deals_index
for each row execute function core.set_updated_at();

alter table core.deals_index enable row level security;

drop policy if exists deals_index_read on core.deals_index;
create policy deals_index_read
  on core.deals_index
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists deals_index_write on core.deals_index;
create policy deals_index_write
  on core.deals_index
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.deals_index cascade;

