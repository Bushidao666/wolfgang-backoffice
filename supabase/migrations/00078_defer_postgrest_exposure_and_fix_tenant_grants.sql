-- vNext Hotfix (prod): avoid failing company provisioning on Supabase Cloud due to lack of privilege
-- to change `pgrst.db_schemas` from within a PostgREST session. Instead, we:
--  1) keep tenant schema provisioning transacional/rápido
--  2) grant privileges properly (anon/authenticated/service_role) so APIs can read/write
--  3) enqueue schemas that must be exposed so an external worker (Backoffice API via direct Postgres)
--     can apply `ALTER ROLE authenticator SET pgrst.db_schemas = ...` out-of-band.

create table if not exists core.postgrest_schema_exposure_queue (
  schema_name text primary key,
  created_at timestamptz not null default now()
);

revoke all on table core.postgrest_schema_exposure_queue from public;
grant select, insert, delete on table core.postgrest_schema_exposure_queue to service_role;

create or replace function core.fn_enqueue_postgrest_schema_exposure(p_schema text)
returns void
language plpgsql
security definer
set search_path = core, public
as $$
declare
  schema_name text;
begin
  schema_name := core.fn_sanitize_schema_name(p_schema);
  insert into core.postgrest_schema_exposure_queue(schema_name)
  values (schema_name)
  on conflict (schema_name) do nothing;
end;
$$;

revoke all on function core.fn_enqueue_postgrest_schema_exposure(text) from public;
grant execute on function core.fn_enqueue_postgrest_schema_exposure(text) to service_role;

create or replace function core.fn_provision_company_schema(p_slug text)
returns text
language plpgsql
security definer
set search_path = core, public
as $$
declare
  schema_name text;
begin
  schema_name := core.fn_sanitize_schema_name(p_slug);

  execute format('create schema if not exists %I', schema_name);

  -- Clone tabelas do template base (estrutura). Triggers e RLS são aplicados abaixo.
  execute format(
    'create table if not exists %I.services (like _template_base.services including all)',
    schema_name
  );
  execute format(
    'create table if not exists %I.equipe (like _template_base.equipe including all)',
    schema_name
  );
  execute format(
    'create table if not exists %I.deals (like _template_base.deals including all)',
    schema_name
  );
  execute format(
    'create table if not exists %I.contratos (like _template_base.contratos including all)',
    schema_name
  );

  -- Corrigir FKs internas (LIKE copia referências do template)
  execute format('alter table %I.services drop constraint if exists services_company_id_fkey', schema_name);
  execute format(
    'alter table %I.services add constraint services_company_id_fkey foreign key (company_id) references core.companies(id) on delete cascade',
    schema_name
  );

  execute format('alter table %I.equipe drop constraint if exists equipe_company_id_fkey', schema_name);
  execute format(
    'alter table %I.equipe add constraint equipe_company_id_fkey foreign key (company_id) references core.companies(id) on delete cascade',
    schema_name
  );

  execute format('alter table %I.deals drop constraint if exists deals_company_id_fkey', schema_name);
  execute format(
    'alter table %I.deals add constraint deals_company_id_fkey foreign key (company_id) references core.companies(id) on delete cascade',
    schema_name
  );

  execute format('alter table %I.deals drop constraint if exists deals_vendedor_responsavel_fkey', schema_name);
  execute format(
    'alter table %I.deals add constraint deals_vendedor_responsavel_fkey foreign key (vendedor_responsavel) references %I.equipe(id)',
    schema_name,
    schema_name
  );

  execute format('alter table %I.contratos drop constraint if exists contratos_company_id_fkey', schema_name);
  execute format(
    'alter table %I.contratos add constraint contratos_company_id_fkey foreign key (company_id) references core.companies(id) on delete cascade',
    schema_name
  );

  execute format('alter table %I.contratos drop constraint if exists contratos_deal_id_fkey', schema_name);
  execute format(
    'alter table %I.contratos add constraint contratos_deal_id_fkey foreign key (deal_id) references %I.deals(id) on delete cascade',
    schema_name,
    schema_name
  );

  -- Triggers updated_at
  execute format('drop trigger if exists set_updated_at on %I.services', schema_name);
  execute format(
    'create trigger set_updated_at before update on %I.services for each row execute function core.set_updated_at()',
    schema_name
  );

  execute format('drop trigger if exists set_updated_at on %I.equipe', schema_name);
  execute format(
    'create trigger set_updated_at before update on %I.equipe for each row execute function core.set_updated_at()',
    schema_name
  );

  execute format('drop trigger if exists set_updated_at on %I.deals', schema_name);
  execute format(
    'create trigger set_updated_at before update on %I.deals for each row execute function core.set_updated_at()',
    schema_name
  );

  execute format('drop trigger if exists set_updated_at on %I.contratos', schema_name);
  execute format(
    'create trigger set_updated_at before update on %I.contratos for each row execute function core.set_updated_at()',
    schema_name
  );

  -- Deals index sync trigger (tenant -> core)
  execute format('drop trigger if exists trg_deals_index_sync on %I.deals', schema_name);
  execute format(
    'create trigger trg_deals_index_sync after insert or update on %I.deals for each row execute function core.fn_upsert_deals_index_from_tenant()',
    schema_name
  );

  -- Índices mínimos
  execute format(
    'create index if not exists %I on %I.%I(company_id)',
    'idx_services_company',
    schema_name,
    'services'
  );
  execute format(
    'create index if not exists %I on %I.%I(company_id)',
    'idx_equipe_company',
    schema_name,
    'equipe'
  );

  -- RLS (isolamento por empresa)
  execute format('alter table %I.services enable row level security', schema_name);
  execute format('alter table %I.equipe enable row level security', schema_name);
  execute format('alter table %I.deals enable row level security', schema_name);
  execute format('alter table %I.contratos enable row level security', schema_name);

  execute format('drop policy if exists tenant_access on %I.services', schema_name);
  execute format(
    'create policy tenant_access on %I.services for all to authenticated using (core.can_access_company(company_id)) with check (core.can_access_company(company_id))',
    schema_name
  );

  execute format('drop policy if exists tenant_access on %I.equipe', schema_name);
  execute format(
    'create policy tenant_access on %I.equipe for all to authenticated using (core.can_access_company(company_id)) with check (core.can_access_company(company_id))',
    schema_name
  );

  execute format('drop policy if exists tenant_access on %I.deals', schema_name);
  execute format(
    'create policy tenant_access on %I.deals for all to authenticated using (core.can_access_company(company_id)) with check (core.can_access_company(company_id))',
    schema_name
  );

  execute format('drop policy if exists tenant_access on %I.contratos', schema_name);
  execute format(
    'create policy tenant_access on %I.contratos for all to authenticated using (core.can_access_company(company_id)) with check (core.can_access_company(company_id))',
    schema_name
  );

  -- Grants (Supabase Data API needs privileges on schema + tables + routines + sequences)
  execute format('grant usage on schema %I to anon, authenticated, service_role', schema_name);
  execute format('grant all on all tables in schema %I to anon, authenticated, service_role', schema_name);
  execute format('grant all on all routines in schema %I to anon, authenticated, service_role', schema_name);
  execute format('grant all on all sequences in schema %I to anon, authenticated, service_role', schema_name);

  -- Default privileges for new objects (created by postgres during provisioning / future migrations)
  execute format('alter default privileges for role postgres in schema %I grant all on tables to anon, authenticated, service_role', schema_name);
  execute format('alter default privileges for role postgres in schema %I grant all on routines to anon, authenticated, service_role', schema_name);
  execute format('alter default privileges for role postgres in schema %I grant all on sequences to anon, authenticated, service_role', schema_name);

  -- Defer PostgREST exposure: enqueue schema for external sync.
  perform core.fn_enqueue_postgrest_schema_exposure(schema_name);

  return schema_name;
end;
$$;

revoke all on function core.fn_provision_company_schema(text) from public;
grant execute on function core.fn_provision_company_schema(text) to service_role;

-- Backfill: fix grants for existing tenants and enqueue schemas for exposure.
do $$
declare
  r record;
begin
  for r in
    select distinct schema_name
    from core.company_crms
    where schema_name is not null and btrim(schema_name) <> ''
  loop
    if not exists (select 1 from pg_namespace where nspname = r.schema_name) then
      continue;
    end if;

    execute format('grant usage on schema %I to anon, authenticated, service_role', r.schema_name);
    execute format('grant all on all tables in schema %I to anon, authenticated, service_role', r.schema_name);
    execute format('grant all on all routines in schema %I to anon, authenticated, service_role', r.schema_name);
    execute format('grant all on all sequences in schema %I to anon, authenticated, service_role', r.schema_name);

    execute format('alter default privileges for role postgres in schema %I grant all on tables to anon, authenticated, service_role', r.schema_name);
    execute format('alter default privileges for role postgres in schema %I grant all on routines to anon, authenticated, service_role', r.schema_name);
    execute format('alter default privileges for role postgres in schema %I grant all on sequences to anon, authenticated, service_role', r.schema_name);

    perform core.fn_enqueue_postgrest_schema_exposure(r.schema_name);
  end loop;
end $$;

