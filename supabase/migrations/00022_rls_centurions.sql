alter table core.centurion_configs enable row level security;
alter table core.channel_instances enable row level security;
alter table core.pixel_configs enable row level security;
alter table core.contract_templates enable row level security;

-- centurions
drop policy if exists centurions_tenant_scope on core.centurion_configs;
create policy centurions_tenant_scope
  on core.centurion_configs
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));

-- channel instances
drop policy if exists channel_instances_tenant_scope on core.channel_instances;
create policy channel_instances_tenant_scope
  on core.channel_instances
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));

-- pixel configs
drop policy if exists pixel_configs_tenant_scope on core.pixel_configs;
create policy pixel_configs_tenant_scope
  on core.pixel_configs
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));

-- contract templates (company_id NULL = global)
drop policy if exists contract_templates_read on core.contract_templates;
create policy contract_templates_read
  on core.contract_templates
  for select
  to authenticated
  using (
    core.is_backoffice_admin()
    or company_id is null
    or core.can_access_company(company_id)
  );

drop policy if exists contract_templates_write on core.contract_templates;
create policy contract_templates_write
  on core.contract_templates
  for all
  to authenticated
  using (
    (company_id is null and core.is_backoffice_admin())
    or (company_id is not null and core.is_company_admin(company_id))
  )
  with check (
    (company_id is null and core.is_backoffice_admin())
    or (company_id is not null and core.is_company_admin(company_id))
  );
