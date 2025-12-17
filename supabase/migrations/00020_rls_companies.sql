-- Helper functions to standardize tenant scope checks
create or replace function core.current_company_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt()->'app_metadata'->>'company_id', '')::uuid,
    nullif(auth.jwt()->'user_metadata'->>'company_id', '')::uuid,
    nullif(auth.jwt()->>'company_id', '')::uuid
  );
$$;

create or replace function core.current_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt()->'app_metadata'->>'role', ''),
    nullif(auth.jwt()->'user_metadata'->>'role', ''),
    nullif(auth.jwt()->>'role', ''),
    auth.role()
  );
$$;

create or replace function core.is_backoffice_admin()
returns boolean
language sql
stable
as $$
  select core.current_role() in ('super_admin', 'backoffice_admin');
$$;

create or replace function core.is_company_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = core, public
as $$
  select core.is_backoffice_admin()
    or exists (
      select 1
      from core.company_users cu
      where cu.company_id = p_company_id
        and cu.user_id = auth.uid()
        and cu.role in ('owner', 'admin')
    );
$$;

create or replace function core.can_access_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = core, public
as $$
  select core.is_backoffice_admin()
    or p_company_id = core.current_company_id()
    or exists (
      select 1
      from core.company_users cu
      where cu.company_id = p_company_id
        and cu.user_id = auth.uid()
    );
$$;

alter table core.companies enable row level security;
alter table core.company_users enable row level security;
alter table core.company_crms enable row level security;

-- companies
drop policy if exists companies_read on core.companies;
create policy companies_read
  on core.companies
  for select
  to authenticated
  using (core.can_access_company(id));

drop policy if exists companies_admin_write on core.companies;
create policy companies_admin_write
  on core.companies
  for all
  to authenticated
  using (core.is_backoffice_admin())
  with check (core.is_backoffice_admin());

-- company_users
drop policy if exists company_users_read on core.company_users;
create policy company_users_read
  on core.company_users
  for select
  to authenticated
  using (
    core.is_backoffice_admin()
    or user_id = auth.uid()
    or core.can_access_company(company_id)
  );

drop policy if exists company_users_admin_write on core.company_users;
create policy company_users_admin_write
  on core.company_users
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));

-- company_crms
drop policy if exists company_crms_read on core.company_crms;
create policy company_crms_read
  on core.company_crms
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists company_crms_admin_write on core.company_crms;
create policy company_crms_admin_write
  on core.company_crms
  for all
  to authenticated
  using (core.is_company_admin(company_id))
  with check (core.is_company_admin(company_id));
