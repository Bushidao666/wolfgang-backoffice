-- Company integrations: global credential sets + per-company bindings
-- This enables "use global credentials" or "custom per-company wizard" flows.

do $$
begin
  if to_regtype('core.integration_provider') is null then
    create type core.integration_provider as enum ('autentique', 'evolution', 'openai');
  end if;
end $$;

create table if not exists core.integration_credential_sets (
  id uuid primary key default gen_random_uuid(),
  provider core.integration_provider not null,
  name text not null,
  is_default boolean not null default false,

  -- Non-secret config (urls, models, flags, etc.)
  config jsonb not null default '{}'::jsonb,

  -- Encrypted secrets payload (format: v1:<iv_b64>:<tag_b64>:<cipher_b64>)
  secrets_enc text not null default '',

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (provider, name)
);

create index if not exists idx_integration_credential_sets_provider
  on core.integration_credential_sets(provider);

create unique index if not exists ux_integration_credential_sets_default_per_provider
  on core.integration_credential_sets(provider)
  where is_default is true;

drop trigger if exists set_updated_at on core.integration_credential_sets;
create trigger set_updated_at
before update on core.integration_credential_sets
for each row execute function core.set_updated_at();

create table if not exists core.company_integration_bindings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  provider core.integration_provider not null,

  mode text not null check (mode in ('global', 'custom', 'disabled')),
  credential_set_id uuid references core.integration_credential_sets(id) on delete restrict,

  config_override jsonb not null default '{}'::jsonb,
  secrets_override_enc text not null default '',

  status text not null default 'active' check (status in ('active', 'invalid', 'testing')),
  last_validated_at timestamptz,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, provider),
  check (
    (mode = 'global' and credential_set_id is not null)
    or (mode in ('custom', 'disabled') and credential_set_id is null)
  )
);

create index if not exists idx_company_integration_bindings_company
  on core.company_integration_bindings(company_id);

create index if not exists idx_company_integration_bindings_provider
  on core.company_integration_bindings(provider);

drop trigger if exists set_updated_at on core.company_integration_bindings;
create trigger set_updated_at
before update on core.company_integration_bindings
for each row execute function core.set_updated_at();

-- Helper RPC: set a credential set as default for its provider (clears previous default).
create or replace function core.fn_set_default_integration_credential_set(p_id uuid)
returns void
language plpgsql
security definer
set search_path = core, public
as $$
declare
  p_provider core.integration_provider;
begin
  select provider into p_provider
  from core.integration_credential_sets
  where id = p_id;

  if p_provider is null then
    raise exception 'credential set not found: %', p_id;
  end if;

  -- Clear any previous default for that provider.
  update core.integration_credential_sets
    set is_default = false
  where provider = p_provider
    and id <> p_id
    and is_default is true;

  update core.integration_credential_sets
    set is_default = true
  where id = p_id;
end;
$$;

revoke all on function core.fn_set_default_integration_credential_set(uuid) from public;
grant execute on function core.fn_set_default_integration_credential_set(uuid) to service_role;

-- RLS: holding-only
alter table core.integration_credential_sets enable row level security;
alter table core.company_integration_bindings enable row level security;

drop policy if exists integration_credential_sets_read on core.integration_credential_sets;
create policy integration_credential_sets_read
  on core.integration_credential_sets
  for select
  to authenticated
  using (core.is_backoffice_admin());

drop policy if exists integration_credential_sets_write on core.integration_credential_sets;
create policy integration_credential_sets_write
  on core.integration_credential_sets
  for all
  to authenticated
  using (core.is_backoffice_admin())
  with check (core.is_backoffice_admin());

drop policy if exists company_integration_bindings_read on core.company_integration_bindings;
create policy company_integration_bindings_read
  on core.company_integration_bindings
  for select
  to authenticated
  using (core.is_backoffice_admin());

drop policy if exists company_integration_bindings_write on core.company_integration_bindings;
create policy company_integration_bindings_write
  on core.company_integration_bindings
  for all
  to authenticated
  using (core.is_backoffice_admin())
  with check (core.is_backoffice_admin());

-- Down (manual):
-- drop function if exists core.fn_set_default_integration_credential_set(uuid);
-- drop table if exists core.company_integration_bindings cascade;
-- drop table if exists core.integration_credential_sets cascade;
-- drop type if exists core.integration_provider;
