create table if not exists core.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  document text null,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  owner_user_id uuid null references auth.users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_document_unique
  on core.companies (document)
  where document is not null;

drop trigger if exists set_updated_at on core.companies;
create trigger set_updated_at
before update on core.companies
for each row execute function core.set_updated_at();

-- Down (manual):
-- drop table if exists core.companies cascade;
