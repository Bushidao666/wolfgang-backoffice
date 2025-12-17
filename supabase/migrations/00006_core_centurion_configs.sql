create table if not exists core.centurion_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  -- Identificação
  name text not null,
  slug text not null,

  -- Comportamento da IA
  prompt text not null,
  personality jsonb default '{}'::jsonb,
  qualification_rules jsonb default '{}'::jsonb,

  -- Capacidades de mídia
  can_send_audio boolean default true,
  can_send_image boolean default true,
  can_send_video boolean default true,
  can_process_audio boolean default true,
  can_process_image boolean default true,

  -- Humanização
  message_chunking_enabled boolean default true,
  chunk_delay_ms int default 1500,
  debounce_wait_ms int default 3000,

  -- Configurações operacionais
  is_active boolean not null default true,
  max_retries int default 3,

  -- Métricas
  total_conversations int default 0,
  total_qualified int default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, slug)
);

create index if not exists idx_centurion_company on core.centurion_configs(company_id);

drop trigger if exists set_updated_at on core.centurion_configs;
create trigger set_updated_at
before update on core.centurion_configs
for each row execute function core.set_updated_at();

-- Marketing Pixel Configs (referenciados por leads)
create table if not exists core.pixel_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  pixel_id text not null,
  meta_access_token text not null,
  meta_test_event_code text,
  domain text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pixel_configs_company on core.pixel_configs(company_id);

drop trigger if exists set_updated_at on core.pixel_configs;
create trigger set_updated_at
before update on core.pixel_configs
for each row execute function core.set_updated_at();

-- Contract Templates (company_id NULL = global)
create table if not exists core.contract_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references core.companies(id) on delete cascade,
  name text not null,
  description text,
  variables jsonb not null default '[]'::jsonb,
  category text not null default 'general',
  is_active boolean not null default true,
  usage_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contract_templates_company on core.contract_templates(company_id);

drop trigger if exists set_updated_at on core.contract_templates;
create trigger set_updated_at
before update on core.contract_templates
for each row execute function core.set_updated_at();

-- Down (manual):
-- drop table if exists core.contract_templates cascade;
-- drop table if exists core.pixel_configs cascade;
-- drop table if exists core.centurion_configs cascade;
