-- Auto-expose tenant schemas in PostgREST (Supabase REST API)
-- Context: The backend uses PostgREST "profiles" via supabase-js `.schema(<schema>)`.
-- When a new company schema is provisioned, it must be added to `pgrst.db_schemas`
-- for the `authenticator` role, otherwise PostgREST returns "Invalid schema".

create or replace function core.fn_postgrest_expose_schema(p_schema text)
returns void
language plpgsql
security definer
set search_path = core, public
as $$
declare
  schema_name text;
  db_oid oid;
  existing_csv text;
  parsed_schemas text[];
  unique_schemas text[] := array[]::text[];
  schema_item text;
  required_schema text;
  new_csv text;
  did_change boolean := false;
  had_duplicates boolean := false;
  has_db_override boolean := false;
begin
  schema_name := core.fn_sanitize_schema_name(p_schema);

  if not exists (select 1 from pg_namespace where nspname = schema_name) then
    raise exception 'schema does not exist: %', schema_name;
  end if;

  -- Avoid races when multiple schemas are provisioned concurrently.
  perform pg_advisory_xact_lock(hashtext('core.fn_postgrest_expose_schema')::bigint);

  select oid into db_oid from pg_database where datname = current_database();

  -- Prefer db-specific settings if they exist, otherwise read the role-level setting.
  select exists(
    select 1
    from pg_db_role_setting s
    join pg_roles r on r.oid = s.setrole
    where r.rolname = 'authenticator'
      and s.setdatabase = db_oid
      and exists (
        select 1 from unnest(s.setconfig) cfg where cfg like 'pgrst.db_schemas=%'
      )
  )
  into has_db_override;

  if has_db_override then
    select split_part(cfg, '=', 2)
    into existing_csv
    from pg_db_role_setting s
    join pg_roles r on r.oid = s.setrole
    cross join lateral unnest(s.setconfig) cfg
    where r.rolname = 'authenticator'
      and s.setdatabase = db_oid
      and cfg like 'pgrst.db_schemas=%'
    limit 1;
  else
    select split_part(cfg, '=', 2)
    into existing_csv
    from pg_roles r
    cross join lateral unnest(r.rolconfig) cfg
    where r.rolname = 'authenticator'
      and cfg like 'pgrst.db_schemas=%'
    limit 1;
  end if;

  if existing_csv is null or btrim(existing_csv) = '' then
    existing_csv := 'public, graphql_public, core, _template_base';
  end if;

  parsed_schemas := regexp_split_to_array(existing_csv, '\\s*,\\s*');
  foreach schema_item in array parsed_schemas loop
    if schema_item is null or btrim(schema_item) = '' then
      continue;
    end if;
    if not schema_item = any(unique_schemas) then
      unique_schemas := array_append(unique_schemas, schema_item);
    else
      had_duplicates := true;
    end if;
  end loop;

  -- Keep required schemas available for this application.
  foreach required_schema in array array['public', 'graphql_public', 'core']::text[] loop
    if not required_schema = any(unique_schemas) then
      unique_schemas := array_append(unique_schemas, required_schema);
      did_change := true;
    end if;
  end loop;

  if not schema_name = any(unique_schemas) then
    unique_schemas := array_append(unique_schemas, schema_name);
    did_change := true;
  end if;

  if had_duplicates then
    did_change := true;
  end if;

  if did_change then
    new_csv := array_to_string(unique_schemas, ', ');

    if has_db_override then
      execute format('alter role authenticator in database %I set pgrst.db_schemas = %L', current_database(), new_csv);
    else
      execute format('alter role authenticator set pgrst.db_schemas = %L', new_csv);
    end if;

    perform pg_notify('pgrst', 'reload config');
  end if;

  -- Always reload the schema cache because we may have just created new tables/triggers.
  perform pg_notify('pgrst', 'reload schema');
end;
$$;

revoke all on function core.fn_postgrest_expose_schema(text) from public;
grant execute on function core.fn_postgrest_expose_schema(text) to service_role;

-- Ensure provisioning keeps deals_index triggers + exposes the new schema to PostgREST.
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
  execute format('alter table %I.deals drop constraint if exists deals_service_id_fkey', schema_name);
  execute format(
    'alter table %I.deals add constraint deals_service_id_fkey foreign key (service_id) references %I.services(id)',
    schema_name,
    schema_name
  );

  execute format('alter table %I.deals drop constraint if exists deals_vendedor_responsavel_fkey', schema_name);
  execute format(
    'alter table %I.deals add constraint deals_vendedor_responsavel_fkey foreign key (vendedor_responsavel) references %I.equipe(id)',
    schema_name,
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

  -- Grants
  execute format('grant usage on schema %I to authenticated', schema_name);
  execute format('grant select, insert, update, delete on all tables in schema %I to authenticated', schema_name);
  execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to authenticated', schema_name);

  -- Expose the schema in PostgREST (needed for `.schema(schema_name)` calls)
  perform core.fn_postgrest_expose_schema(schema_name);

  return schema_name;
end;
$$;

revoke all on function core.fn_provision_company_schema(text) from public;
grant execute on function core.fn_provision_company_schema(text) to service_role;

-- Backfill: ensure all existing company schemas have the deals_index trigger.
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

    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = r.schema_name
        and c.relname = 'deals'
        and c.relkind = 'r'
    ) then
      execute format('drop trigger if exists trg_deals_index_sync on %I.deals', r.schema_name);
      execute format(
        'create trigger trg_deals_index_sync after insert or update on %I.deals for each row execute function core.fn_upsert_deals_index_from_tenant()',
        r.schema_name
      );
    end if;

    -- Backfill: expose already provisioned schemas too (fixes existing tenants like `iza_key_account`).
    perform core.fn_postgrest_expose_schema(r.schema_name);
  end loop;
end $$;
