-- FKs adicionadas após criação das tabelas alvo
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'core'
      and table_name = 'leads'
      and constraint_name = 'leads_centurion_id_fkey'
  ) then
    alter table core.leads
      add constraint leads_centurion_id_fkey
      foreign key (centurion_id) references core.centurion_configs(id);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'core'
      and table_name = 'leads'
      and constraint_name = 'leads_pixel_config_id_fkey'
  ) then
    alter table core.leads
      add constraint leads_pixel_config_id_fkey
      foreign key (pixel_config_id) references core.pixel_configs(id);
  end if;
end $$;

-- Índices adicionais para queries principais
create index if not exists idx_conversations_company_updated_at
  on core.conversations(company_id, updated_at desc);

create index if not exists idx_centurion_active
  on core.centurion_configs(company_id, is_active);

-- pgvector index (ivfflat) para busca semântica
do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    execute 'create index if not exists idx_lead_memories_embeddings_ivfflat on core.lead_memories using ivfflat (embeddings vector_cosine_ops) with (lists = 100)';
  end if;
end $$;

