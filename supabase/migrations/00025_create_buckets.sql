-- Buckets padrão
-- Observação: em alguns ambientes locais o owner de `storage.buckets` pode não ser o usuário das migrations.
-- Este script é "best-effort": se não houver permissão para inserir, ele não falha o deploy.

do $$
begin
  begin
    insert into storage.buckets (id, name, public)
    values ('knowledge_base', 'knowledge_base', false)
    on conflict (id) do nothing;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to create bucket knowledge_base';
  end;

  begin
    insert into storage.buckets (id, name, public)
    values ('deal_files', 'deal_files', false)
    on conflict (id) do nothing;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to create bucket deal_files';
  end;
end $$;

