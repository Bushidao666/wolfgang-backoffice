-- Atomic company provisioning (company row + tenant schema + mappings + optional integrations).
-- This avoids orphan schemas if the API crashes mid-provision.

create or replace function core.fn_create_company_full(
  p_name text,
  p_slug text,
  p_document text default null,
  p_owner_user_id uuid default null,
  p_settings jsonb default '{}'::jsonb,
  p_integrations jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = core, public
as $$
declare
  v_slug text;
  v_company core.companies%rowtype;
  v_schema_name text;
  it jsonb;
  provider text;
  mode text;
  set_id uuid;
  cfg jsonb;
  secrets_enc text;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'company name is required';
  end if;

  v_slug := core.fn_sanitize_schema_name(p_slug);

  insert into core.companies (name, slug, document, owner_user_id, settings)
  values (
    btrim(p_name),
    v_slug,
    nullif(btrim(coalesce(p_document, '')), ''),
    p_owner_user_id,
    coalesce(p_settings, '{}'::jsonb)
  )
  returning * into v_company;

  v_schema_name := core.fn_provision_company_schema(v_slug);

  insert into core.company_crms (company_id, schema_name, is_primary)
  values (v_company.id, v_schema_name, true)
  on conflict (company_id, schema_name) do update set is_primary = excluded.is_primary;

  -- Ensure a default Centurion config exists (idempotent).
  if not exists (select 1 from core.centurion_configs where company_id = v_company.id limit 1) then
    insert into core.centurion_configs (
      company_id,
      name,
      slug,
      prompt,
      personality,
      qualification_rules,
      message_chunking_enabled,
      chunk_delay_ms,
      debounce_wait_ms,
      is_active
    )
    values (
      v_company.id,
      'Centurion Padrão',
      'default',
      'Você é um SDR educado e objetivo. Faça perguntas para entender a necessidade do lead, coletar data, local e orçamento quando aplicável, e conduzir para o próximo passo.',
      jsonb_build_object('tone', 'friendly', 'language', 'pt-BR'),
      jsonb_build_object('required_fields', jsonb_build_array('budget','date','location'), 'threshold', 1.0),
      true,
      1500,
      3000,
      true
    );
  end if;

  -- Optional integrations bindings (array of objects).
  if p_integrations is not null and jsonb_typeof(p_integrations) = 'array' then
    for it in select * from jsonb_array_elements(p_integrations) loop
      provider := lower(coalesce(it->>'provider', ''));
      mode := lower(coalesce(it->>'mode', ''));
      cfg := coalesce(it->'config_override', '{}'::jsonb);
      secrets_enc := coalesce(it->>'secrets_override_enc', '');

      if provider = '' then
        continue;
      end if;

      if mode not in ('global', 'custom', 'disabled') then
        raise exception 'invalid integration mode: %', mode;
      end if;

      set_id := null;
      if mode = 'global' then
        if (it ? 'credential_set_id') and nullif(btrim(it->>'credential_set_id'), '') is not null then
          set_id := (it->>'credential_set_id')::uuid;
        else
          raise exception 'credential_set_id is required when mode=global (provider=%)', provider;
        end if;
      end if;

      insert into core.company_integration_bindings (
        company_id,
        provider,
        mode,
        credential_set_id,
        config_override,
        secrets_override_enc,
        status
      )
      values (
        v_company.id,
        provider::core.integration_provider,
        mode,
        set_id,
        cfg,
        secrets_enc,
        'active'
      )
      on conflict (company_id, provider) do update
        set mode = excluded.mode,
            credential_set_id = excluded.credential_set_id,
            config_override = excluded.config_override,
            secrets_override_enc = excluded.secrets_override_enc,
            status = excluded.status,
            last_error = null;
    end loop;
  end if;

  return jsonb_build_object(
    'company',
    to_jsonb(v_company),
    'schema_name',
    v_schema_name
  );
end;
$$;

revoke all on function core.fn_create_company_full(text, text, text, uuid, jsonb, jsonb) from public;
grant execute on function core.fn_create_company_full(text, text, text, uuid, jsonb, jsonb) to service_role;

-- Down (manual):
-- drop function if exists core.fn_create_company_full(text, text, text, uuid, jsonb, jsonb);
