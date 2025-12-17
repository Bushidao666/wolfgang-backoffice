create table if not exists core.mcp_servers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  centurion_id uuid not null references core.centurion_configs(id) on delete cascade,

  name text not null,
  server_url text not null,

  auth_type text,
  auth_config jsonb default '{}'::jsonb,

  tools_available jsonb default '[]'::jsonb,
  last_tools_sync_at timestamptz,

  is_active boolean default true,
  connection_status text default 'unknown' check (connection_status in ('unknown', 'connected', 'disconnected', 'error')),
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (centurion_id, server_url)
);

create index if not exists idx_mcp_servers_company on core.mcp_servers(company_id);
create index if not exists idx_mcp_servers_centurion on core.mcp_servers(centurion_id);

drop trigger if exists set_updated_at on core.mcp_servers;
create trigger set_updated_at
before update on core.mcp_servers
for each row execute function core.set_updated_at();

alter table core.mcp_servers enable row level security;

drop policy if exists mcp_servers_read on core.mcp_servers;
create policy mcp_servers_read
  on core.mcp_servers
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists mcp_servers_write on core.mcp_servers;
create policy mcp_servers_write
  on core.mcp_servers
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.mcp_servers cascade;

