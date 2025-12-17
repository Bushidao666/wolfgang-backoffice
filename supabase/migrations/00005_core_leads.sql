create table if not exists core.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  -- Dados pessoais
  name text,
  phone text not null,
  email text,
  cpf text,

  -- Ciclo de vida
  lifecycle_stage text not null default 'new' check (
    lifecycle_stage in (
      'new',
      'proactive_contacted',
      'proactive_replied',
      'contacted',
      'follow_up_pending',
      'follow_up_sent',
      'negotiation',
      'qualified',
      'handoff_done',
      'closed_lost'
    )
  ),
  is_qualified boolean not null default false,
  qualification_score numeric,
  qualification_data jsonb default '{}'::jsonb,

  -- Vinculação (constraints adicionadas após criação das tabelas alvo)
  centurion_id uuid,
  pixel_config_id uuid,

  -- Tracking
  utm_campaign text,
  utm_source text,
  utm_medium text,
  utm_term text,
  utm_content text,
  contact_fingerprint text,
  fb_data jsonb default '{}'::jsonb,

  -- Timestamps
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, phone)
);

create index if not exists idx_leads_company_phone on core.leads(company_id, phone);
create index if not exists idx_leads_company_lifecycle on core.leads(company_id, lifecycle_stage);

drop trigger if exists set_updated_at on core.leads;
create trigger set_updated_at
before update on core.leads
for each row execute function core.set_updated_at();

-- Down (manual):
-- drop table if exists core.leads cascade;
