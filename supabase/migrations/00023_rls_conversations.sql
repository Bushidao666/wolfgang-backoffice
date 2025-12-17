alter table core.conversations enable row level security;
alter table core.messages enable row level security;
alter table core.lead_memories enable row level security;
alter table core.lead_graphs enable row level security;

drop policy if exists conversations_tenant_scope on core.conversations;
create policy conversations_tenant_scope
  on core.conversations
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));

drop policy if exists messages_tenant_scope on core.messages;
create policy messages_tenant_scope
  on core.messages
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));

drop policy if exists lead_memories_tenant_scope on core.lead_memories;
create policy lead_memories_tenant_scope
  on core.lead_memories
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));

drop policy if exists lead_graphs_tenant_scope on core.lead_graphs;
create policy lead_graphs_tenant_scope
  on core.lead_graphs
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));
