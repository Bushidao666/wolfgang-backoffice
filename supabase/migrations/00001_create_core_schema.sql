-- Schema CORE (governança, leads, centurions, conversas, memória)

create extension if not exists "pgcrypto" with schema extensions;

create schema if not exists core;

create or replace function core.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Down (manual):
-- drop schema if exists core cascade;
