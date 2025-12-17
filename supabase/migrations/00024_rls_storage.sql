-- RLS para Storage (buckets: knowledge_base, deal_files)
-- Observação: em alguns ambientes locais o owner de `storage.objects` pode não ser o usuário das migrations.
-- Este script é "best-effort": se não houver permissão para alterar/criar policy, ele não falha o deploy.

do $$
begin
  begin
    alter table storage.objects enable row level security;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to enable RLS on storage.objects';
  end;

  begin
    execute 'drop policy if exists knowledge_base_company_scope on storage.objects';
    execute $policy$
      create policy knowledge_base_company_scope
        on storage.objects
        for all
        to authenticated
        using (
          bucket_id = 'knowledge_base'
          and (
            core.is_backoffice_admin()
            or split_part(name, '/', 1) = core.current_company_id()::text
          )
        )
        with check (
          bucket_id = 'knowledge_base'
          and (
            core.is_backoffice_admin()
            or split_part(name, '/', 1) = core.current_company_id()::text
          )
        )
    $policy$;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to create policy knowledge_base_company_scope on storage.objects';
  end;

  begin
    execute 'drop policy if exists deal_files_company_scope on storage.objects';
    execute $policy$
      create policy deal_files_company_scope
        on storage.objects
        for all
        to authenticated
        using (
          bucket_id = 'deal_files'
          and (
            core.is_backoffice_admin()
            or split_part(name, '/', 1) = core.current_company_id()::text
          )
        )
        with check (
          bucket_id = 'deal_files'
          and (
            core.is_backoffice_admin()
            or split_part(name, '/', 1) = core.current_company_id()::text
          )
        )
    $policy$;
  exception when insufficient_privilege then
    raise notice 'skip: insufficient privilege to create policy deal_files_company_scope on storage.objects';
  end;
end $$;

