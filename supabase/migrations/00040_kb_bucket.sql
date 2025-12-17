-- Knowledge Base bucket (idempotente)
-- Nota: bucket também é criado em migrations anteriores; mantemos aqui para alinhamento com o backlog.
do $$
begin
  begin
    insert into storage.buckets (id, name, public)
    values ('knowledge_base', 'knowledge_base', false)
    on conflict (id) do nothing;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to create bucket knowledge_base';
  end;
end $$;

