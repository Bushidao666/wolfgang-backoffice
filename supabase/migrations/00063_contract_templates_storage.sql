-- Storage bucket for contract templates (idempotent)
do $$
begin
  begin
    insert into storage.buckets (id, name, public)
    values ('contract_templates', 'contract_templates', false)
    on conflict (id) do nothing;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to create bucket contract_templates';
  end;
end $$;

alter table core.contract_templates
  add column if not exists file_path text,
  add column if not exists file_type text;

-- Optional indexes
create index if not exists idx_contract_templates_company_active
  on core.contract_templates(company_id, is_active);

