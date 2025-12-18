-- Track which Autentique credential set was used for a contract (helps webhooks + auditing).

alter table core.contracts
  add column if not exists autentique_credential_set_id uuid references core.integration_credential_sets(id) on delete set null;

create index if not exists idx_contracts_autentique_credential_set
  on core.contracts(autentique_credential_set_id);

-- Down (manual):
-- drop index if exists core.idx_contracts_autentique_credential_set;
-- alter table core.contracts drop column if exists autentique_credential_set_id;

