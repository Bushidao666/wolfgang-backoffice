create table if not exists core.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  actor_user_id uuid,
  actor_role text,

  action text not null,
  entity_type text,
  entity_id uuid,

  request_id text,
  correlation_id text,
  ip_address text,
  user_agent text,

  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company on core.audit_logs(company_id, created_at desc);
create index if not exists idx_audit_logs_entity on core.audit_logs(entity_type, entity_id, created_at desc);

alter table core.audit_logs enable row level security;

drop policy if exists audit_logs_tenant_scope on core.audit_logs;
create policy audit_logs_tenant_scope
  on core.audit_logs
  for all
  to authenticated
  using (core.can_access_company(company_id))
  with check (core.can_access_company(company_id));

