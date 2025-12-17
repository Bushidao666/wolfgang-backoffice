create table if not exists core.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  document_id uuid not null references core.knowledge_documents(id) on delete cascade,

  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_chunks_company on core.knowledge_chunks(company_id);
create index if not exists idx_knowledge_chunks_document on core.knowledge_chunks(document_id, chunk_index);

do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    execute 'create index if not exists idx_knowledge_chunks_embedding_ivfflat on core.knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100)';
  end if;
end $$;

alter table core.knowledge_chunks enable row level security;

drop policy if exists knowledge_chunks_read on core.knowledge_chunks;
create policy knowledge_chunks_read
  on core.knowledge_chunks
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists knowledge_chunks_write on core.knowledge_chunks;
create policy knowledge_chunks_write
  on core.knowledge_chunks
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.knowledge_chunks cascade;

