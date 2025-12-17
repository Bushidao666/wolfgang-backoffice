alter table core.leads enable row level security;

drop policy if exists leads_tenant_scope on core.leads;
create policy leads_tenant_scope
  on core.leads
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));
