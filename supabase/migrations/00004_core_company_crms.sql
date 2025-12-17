create table if not exists core.company_crms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  schema_name text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, schema_name)
);

create unique index if not exists ux_company_crms_primary
  on core.company_crms(company_id)
  where is_primary is true;

create index if not exists idx_company_crms_company on core.company_crms(company_id);

drop trigger if exists set_updated_at on core.company_crms;
create trigger set_updated_at
before update on core.company_crms
for each row execute function core.set_updated_at();

-- Down (manual):
-- drop table if exists core.company_crms cascade;
