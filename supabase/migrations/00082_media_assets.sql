-- Media Tools: assets + playbooks (append-only operational metadata lives elsewhere).
-- Storage bucket + DB tables used by backoffice + agent runtime.

-- Storage bucket for media assets (idempotent)
do $$
begin
  begin
    insert into storage.buckets (id, name, public)
    values ('media_assets', 'media_assets', false)
    on conflict (id) do nothing;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to create bucket media_assets';
  end;
end $$;

do $$
begin
  if to_regtype('core.media_asset_type') is null then
    create type core.media_asset_type as enum ('audio', 'image', 'video', 'document');
  end if;
end $$;

create table if not exists core.media_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  centurion_id uuid null references core.centurion_configs(id) on delete set null,

  name text not null,
  description text,

  media_type core.media_asset_type not null,
  mime_type text not null,

  bucket text not null default 'media_assets',
  file_path text not null,
  file_size_bytes int,

  tags jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, file_path),
  check (char_length(name) <= 200),
  check (char_length(mime_type) <= 200),
  check (char_length(bucket) <= 64),
  check (char_length(file_path) <= 512)
);

create index if not exists idx_media_assets_company_created_at
  on core.media_assets(company_id, created_at desc);

create index if not exists idx_media_assets_company_centurion
  on core.media_assets(company_id, centurion_id);

create index if not exists idx_media_assets_tags
  on core.media_assets using gin (tags jsonb_path_ops);

drop trigger if exists set_updated_at on core.media_assets;
create trigger set_updated_at
before update on core.media_assets
for each row execute function core.set_updated_at();

-- Playbooks (optional): ordered sequences of assets/steps.
create table if not exists core.media_playbooks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  centurion_id uuid null references core.centurion_configs(id) on delete set null,

  name text not null,
  description text,

  tags jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, name),
  check (char_length(name) <= 200)
);

create index if not exists idx_media_playbooks_company_created_at
  on core.media_playbooks(company_id, created_at desc);

create index if not exists idx_media_playbooks_company_centurion
  on core.media_playbooks(company_id, centurion_id);

drop trigger if exists set_updated_at on core.media_playbooks;
create trigger set_updated_at
before update on core.media_playbooks
for each row execute function core.set_updated_at();

create table if not exists core.media_playbook_steps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,
  playbook_id uuid not null references core.media_playbooks(id) on delete cascade,

  step_order int not null,
  asset_id uuid references core.media_assets(id) on delete set null,

  title text,
  instruction text,
  delay_ms int not null default 0,

  created_at timestamptz not null default now(),

  unique (playbook_id, step_order),
  check (step_order >= 0),
  check (delay_ms >= 0),
  check (char_length(title) <= 200)
);

create index if not exists idx_media_playbook_steps_playbook_order
  on core.media_playbook_steps(playbook_id, step_order);

create index if not exists idx_media_playbook_steps_company
  on core.media_playbook_steps(company_id, created_at desc);

-- RLS
alter table core.media_assets enable row level security;
alter table core.media_playbooks enable row level security;
alter table core.media_playbook_steps enable row level security;

drop policy if exists media_assets_read on core.media_assets;
create policy media_assets_read
  on core.media_assets
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists media_assets_write on core.media_assets;
create policy media_assets_write
  on core.media_assets
  for all
  to authenticated
  using (core.is_company_admin(company_id) or core.is_backoffice_admin())
  with check (core.is_company_admin(company_id) or core.is_backoffice_admin());

drop policy if exists media_playbooks_read on core.media_playbooks;
create policy media_playbooks_read
  on core.media_playbooks
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists media_playbooks_write on core.media_playbooks;
create policy media_playbooks_write
  on core.media_playbooks
  for all
  to authenticated
  using (core.is_company_admin(company_id) or core.is_backoffice_admin())
  with check (core.is_company_admin(company_id) or core.is_backoffice_admin());

drop policy if exists media_playbook_steps_read on core.media_playbook_steps;
create policy media_playbook_steps_read
  on core.media_playbook_steps
  for select
  to authenticated
  using (core.can_access_company(company_id));

drop policy if exists media_playbook_steps_write on core.media_playbook_steps;
create policy media_playbook_steps_write
  on core.media_playbook_steps
  for all
  to authenticated
  using (core.is_company_admin(company_id) or core.is_backoffice_admin())
  with check (core.is_company_admin(company_id) or core.is_backoffice_admin());

revoke all on table core.media_assets from public;
revoke all on table core.media_playbooks from public;
revoke all on table core.media_playbook_steps from public;

grant select, insert, update, delete on table core.media_assets to authenticated;
grant select, insert, update, delete on table core.media_playbooks to authenticated;
grant select, insert, update, delete on table core.media_playbook_steps to authenticated;

-- Down (manual):
-- drop table if exists core.media_playbook_steps cascade;
-- drop table if exists core.media_playbooks cascade;
-- drop table if exists core.media_assets cascade;
-- drop type if exists core.media_asset_type;
