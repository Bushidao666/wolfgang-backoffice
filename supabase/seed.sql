-- Seed básico para desenvolvimento local
-- Observação: usuários devem ser criados via Supabase Auth (Studio/API).

insert into core.companies (id, name, slug, status, settings)
values (
  '11111111-1111-1111-1111-111111111111',
  'Empresa Demo',
  'empresa-demo',
  'active',
  '{"timezone":"America/Sao_Paulo"}'::jsonb
)
on conflict (slug) do nothing;

-- Provisionar schema do tenant e registrar CRM primário
with provision as (
  select core.fn_provision_company_schema('empresa-demo') as schema_name
)
insert into core.company_crms (company_id, schema_name, is_primary)
select
  '11111111-1111-1111-1111-111111111111',
  provision.schema_name,
  true
from provision
on conflict do nothing;

insert into core.centurion_configs (
  company_id,
  name,
  slug,
  prompt,
  qualification_rules,
  can_process_audio,
  can_process_image,
  message_chunking_enabled,
  debounce_wait_ms
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Centurion Demo',
  'centurion-demo',
  'Você é um SDR educado e objetivo. Faça perguntas para qualificar o lead.',
  '{"required_fields":["budget","date","location"]}'::jsonb,
  true,
  true,
  true,
  3000
)
on conflict (company_id, slug) do nothing;
