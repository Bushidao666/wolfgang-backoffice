-- Grants básicos para roles do Supabase
-- Necessário para que RLS seja efetivo (a role precisa ter permissão de schema/tabela).

grant usage on schema core to authenticated;

grant select, insert, update, delete on all tables in schema core to authenticated;
grant usage, select on all sequences in schema core to authenticated;

alter default privileges in schema core
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema core
grant usage, select on sequences to authenticated;
