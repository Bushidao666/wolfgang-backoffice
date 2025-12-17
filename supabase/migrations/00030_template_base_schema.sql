-- Schema template para novos tenants (clonado no provisionamento)

create schema if not exists _template_base;

-- Services
create table if not exists _template_base.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  nome text not null,
  descricao text,
  valor_padrao numeric,
  max_parcelas int,
  formas_pagamento text[],
  contrato_template_id uuid references core.contract_templates(id),

  is_active boolean default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on _template_base.services;
create trigger set_updated_at
before update on _template_base.services
for each row execute function core.set_updated_at();

-- Equipe (time de vendas)
create table if not exists _template_base.equipe (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  user_id uuid references auth.users(id),

  user_email text not null,
  user_name text,
  role text not null check (role in ('closer', 'manager', 'admin')),
  status text default 'active' check (status in ('active', 'inactive')),
  last_activity timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on _template_base.equipe;
create trigger set_updated_at
before update on _template_base.equipe
for each row execute function core.set_updated_at();

-- Deals
create table if not exists _template_base.deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  core_lead_id uuid not null references core.leads(id) on delete restrict,

  deal_first_name text,
  deal_last_name text,
  deal_full_name text,
  deal_phone text,
  deal_email text,
  deal_cpf text,
  deal_rg text,

  deal_rua text,
  deal_numero text,
  deal_bairro text,
  deal_cidade text,
  deal_estado text,
  deal_cep text,

  deal_servico text,
  service_id uuid references _template_base.services(id),
  deal_valor_contrato numeric,
  deal_forma_pagamento text,
  deal_parcelas int,
  parcelas_datas jsonb,

  deal_documento_frente text,
  deal_documento_verso text,
  deal_audio text,
  deal_comprovante_residencia text,
  deal_copia_contrato_assinado text,

  deal_status text not null default 'negocio_novo',
  motivo_rejeicao text,
  vendedor_responsavel uuid references _template_base.equipe(id),

  pixel_config_id uuid,
  contact_fingerprint text,
  utm_campaign text,
  utm_source text,
  utm_medium text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_template_deals_company on _template_base.deals(company_id);
create index if not exists idx_template_deals_core_lead on _template_base.deals(core_lead_id);

drop trigger if exists set_updated_at on _template_base.deals;
create trigger set_updated_at
before update on _template_base.deals
for each row execute function core.set_updated_at();

-- Contratos (por schema de empresa)
create table if not exists _template_base.contratos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  deal_id uuid not null references _template_base.deals(id) on delete cascade,
  template_id uuid references core.contract_templates(id),

  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'canceled', 'expired')),
  contract_url text,
  autentique_id text,
  contract_data jsonb not null default '{}'::jsonb,
  value numeric,

  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_template_contratos_company on _template_base.contratos(company_id);
create index if not exists idx_template_contratos_deal on _template_base.contratos(deal_id);

drop trigger if exists set_updated_at on _template_base.contratos;
create trigger set_updated_at
before update on _template_base.contratos
for each row execute function core.set_updated_at();

