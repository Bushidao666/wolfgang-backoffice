create table if not exists core.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  lead_id uuid references core.leads(id) on delete set null,
  deal_index_id uuid references core.deals_index(id) on delete set null,
  template_id uuid not null references core.contract_templates(id) on delete restrict,

  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'canceled', 'expired')),
  contract_url text,
  autentique_id text,
  contract_data jsonb not null default '{}'::jsonb,
  value numeric,

  signed_at timestamptz,
  first_payment_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contracts_company on core.contracts(company_id);
create index if not exists idx_contracts_deal_index on core.contracts(deal_index_id);
create index if not exists idx_contracts_lead on core.contracts(lead_id);
create index if not exists idx_contracts_status on core.contracts(company_id, status);

drop trigger if exists set_updated_at on core.contracts;
create trigger set_updated_at
before update on core.contracts
for each row execute function core.set_updated_at();

alter table core.contracts enable row level security;

drop policy if exists contracts_read on core.contracts;
create policy contracts_read
  on core.contracts
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists contracts_write on core.contracts;
create policy contracts_write
  on core.contracts
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- Down (manual):
-- drop table if exists core.contracts cascade;

