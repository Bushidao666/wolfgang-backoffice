create table if not exists core.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  title text not null,
  file_path text not null,
  file_type text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'error')),

  uploaded_by uuid,
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_documents_company on core.knowledge_documents(company_id);
create index if not exists idx_knowledge_documents_company_status on core.knowledge_documents(company_id, status);

drop trigger if exists set_updated_at on core.knowledge_documents;
create trigger set_updated_at
before update on core.knowledge_documents
for each row execute function core.set_updated_at();

alter table core.knowledge_documents enable row level security;

drop policy if exists knowledge_documents_read on core.knowledge_documents;
create policy knowledge_documents_read
  on core.knowledge_documents
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists knowledge_documents_write on core.knowledge_documents;
create policy knowledge_documents_write
  on core.knowledge_documents
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.knowledge_documents cascade;

