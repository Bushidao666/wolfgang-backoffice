-- Fix: regexp_split_to_array pattern must use an escape string (E'...') so `\\s` becomes `\s` in the regex engine.
-- Without this, pgrst.db_schemas parsing breaks and duplicates accumulate.

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

  perform pg_advisory_xact_lock(hashtext('core.fn_postgrest_expose_schema')::bigint);

  select oid into db_oid from pg_database where datname = current_database();

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

  parsed_schemas := regexp_split_to_array(existing_csv, E'\\s*,\\s*');
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

  perform pg_notify('pgrst', 'reload schema');
end;
$$;

revoke all on function core.fn_postgrest_expose_schema(text) from public;
grant execute on function core.fn_postgrest_expose_schema(text) to service_role;

-- One-time cleanup of existing duplicated config.
select core.fn_postgrest_expose_schema('core');

