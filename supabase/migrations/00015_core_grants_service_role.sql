-- Grants para service_role (bypass RLS, porém ainda precisa de privilégios de schema/tabela)

grant usage on schema core to service_role;

grant select, insert, update, delete on all tables in schema core to service_role;
grant usage, select on all sequences in schema core to service_role;

alter default privileges in schema core
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema core
grant usage, select on sequences to service_role;

