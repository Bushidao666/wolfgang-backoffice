create table if not exists core.tool_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  centurion_id uuid not null references core.centurion_configs(id) on delete cascade,

  tool_name text not null,
  description text,

  endpoint text not null,
  method text not null default 'POST' check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  headers jsonb default '{}'::jsonb,
  auth_type text,
  auth_config jsonb default '{}'::jsonb,

  input_schema jsonb not null,
  output_schema jsonb,

  timeout_ms int default 10000,
  retry_count int default 1,
  is_active boolean default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (centurion_id, tool_name)
);

create index if not exists idx_tool_configs_company on core.tool_configs(company_id);
create index if not exists idx_tool_configs_centurion on core.tool_configs(centurion_id);

drop trigger if exists set_updated_at on core.tool_configs;
create trigger set_updated_at
before update on core.tool_configs
for each row execute function core.set_updated_at();

alter table core.tool_configs enable row level security;

drop policy if exists tool_configs_read on core.tool_configs;
create policy tool_configs_read
  on core.tool_configs
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists tool_configs_write on core.tool_configs;
create policy tool_configs_write
  on core.tool_configs
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.tool_configs cascade;

