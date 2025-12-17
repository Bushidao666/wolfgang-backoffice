create table if not exists core.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'operator', 'viewer', 'sales_rep', 'super_admin', 'backoffice_admin')),
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_users_company on core.company_users(company_id);
create index if not exists idx_company_users_user on core.company_users(user_id);

drop trigger if exists set_updated_at on core.company_users;
create trigger set_updated_at
before update on core.company_users
for each row execute function core.set_updated_at();

-- Down (manual):
-- drop table if exists core.company_users cascade;
