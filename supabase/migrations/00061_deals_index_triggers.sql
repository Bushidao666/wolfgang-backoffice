create or replace function core.fn_upsert_deals_index_from_tenant()
returns trigger
language plpgsql
security definer
set search_path = core, public
as $$
declare
  tenant_schema text;
begin
  tenant_schema := TG_TABLE_SCHEMA;

  insert into core.deals_index (
    company_id,
    schema_name,
    local_deal_id,
    status,
    value,
    opened_at,
    closed_at
  )
  values (
    new.company_id,
    tenant_schema,
    new.id,
    new.deal_status,
    new.deal_valor_contrato,
    coalesce(new.created_at, now()),
    null
  )
  on conflict (schema_name, local_deal_id) do update
  set
    company_id = excluded.company_id,
    status = excluded.status,
    value = excluded.value,
    opened_at = excluded.opened_at,
    updated_at = now();

  return new;
end;
$$;

revoke all on function core.fn_upsert_deals_index_from_tenant() from public;
grant execute on function core.fn_upsert_deals_index_from_tenant() to service_role;

-- Apply triggers to existing tenant schemas (company_crms)
do $$
declare
  r record;
begin
  for r in
    select schema_name
    from core.company_crms
  loop
    execute format('drop trigger if exists trg_deals_index_sync on %I.deals', r.schema_name);
    execute format(
      'create trigger trg_deals_index_sync after insert or update on %I.deals for each row execute function core.fn_upsert_deals_index_from_tenant()',
      r.schema_name
    );
  end loop;
end $$;

-- Ensure new provisions include the trigger
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

  return schema_name;
end;
$$;

revoke all on function core.fn_provision_company_schema(text) from public;
grant execute on function core.fn_provision_company_schema(text) to service_role;

