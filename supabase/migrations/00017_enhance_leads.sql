-- Adiciona campos de canal e handoff à tabela core.leads
-- Complementa a migration 00005 com campos do modelo completo

-- Adicionar campos de canal (vinculação à instância de canal)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'core' and table_name = 'leads' and column_name = 'channel_type'
  ) then
    alter table core.leads add column channel_type core.channel_type;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'core' and table_name = 'leads' and column_name = 'channel_instance_id'
  ) then
    alter table core.leads add column channel_instance_id uuid references core.channel_instances(id);
  end if;
end $$;

-- Adicionar campos de Facebook tracking (fbc, fbp)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'core' and table_name = 'leads' and column_name = 'fbc'
  ) then
    alter table core.leads add column fbc text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'core' and table_name = 'leads' and column_name = 'fbp'
  ) then
    alter table core.leads add column fbp text;
  end if;
end $$;

-- Adicionar campos de handoff (passagem para vendedor)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'core' and table_name = 'leads' and column_name = 'handoff_status'
  ) then
    alter table core.leads add column handoff_status text check (
      handoff_status in ('pending', 'in_progress', 'completed', 'failed')
    );
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'core' and table_name = 'leads' and column_name = 'handoff_at'
  ) then
    alter table core.leads add column handoff_at timestamptz;
  end if;
end $$;

-- Criar índices para otimização de queries
create index if not exists idx_leads_channel_instance
  on core.leads(channel_instance_id) where channel_instance_id is not null;

create index if not exists idx_leads_handoff_status
  on core.leads(company_id, handoff_status) where handoff_status is not null;

-- Down (manual):
-- alter table core.leads drop column if exists channel_type;
-- alter table core.leads drop column if exists channel_instance_id;
-- alter table core.leads drop column if exists fbc;
-- alter table core.leads drop column if exists fbp;
-- alter table core.leads drop column if exists handoff_status;
-- alter table core.leads drop column if exists handoff_at;
