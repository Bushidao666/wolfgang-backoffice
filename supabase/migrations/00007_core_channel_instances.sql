do $$
begin
  if not exists (select 1 from pg_type where typname = 'channel_type') then
    create type core.channel_type as enum ('whatsapp', 'instagram', 'telegram');
  end if;
end $$;

create table if not exists core.channel_instances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references core.companies(id) on delete cascade,

  channel_type core.channel_type not null,
  instance_name text unique not null,
  state text not null default 'disconnected' check (state in ('connected', 'disconnected', 'qr_ready', 'error')),

  phone_number text,
  instagram_account_id text,
  telegram_bot_token text,

  profile_name text,
  credentials jsonb default '{}'::jsonb,

  last_connected_at timestamptz,
  last_disconnected_at timestamptz,
  error_message text,
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_channel_instances_company on core.channel_instances(company_id);
create index if not exists idx_channel_instances_type on core.channel_instances(channel_type);

drop trigger if exists set_updated_at on core.channel_instances;
create trigger set_updated_at
before update on core.channel_instances
for each row execute function core.set_updated_at();

-- Down (manual):
-- drop table if exists core.channel_instances cascade;
-- drop type if exists core.channel_type;
