begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions, core;

select plan(6);

insert into core.companies (id, name, slug, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company A', 'company-a', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Company B', 'company-b', 'active');

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'authenticated', 'authenticated', 'a@example.com', '{}'::jsonb, '{}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'authenticated', 'authenticated', 'b@example.com', '{}'::jsonb, '{}'::jsonb),
  ('cccccccc-cccc-cccc-cccc-cccccccc0001', 'authenticated', 'authenticated', 'admin@example.com',
   '{"role":"backoffice_admin"}'::jsonb, '{}'::jsonb);

insert into core.company_users (company_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'admin');

insert into core.knowledge_documents (id, company_id, title, file_path, file_type, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa4001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Doc A', 'a/doc_a.txt', 'txt', 'ready'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb4001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Doc B', 'b/doc_b.txt', 'txt', 'ready');

insert into core.knowledge_chunks (company_id, document_id, chunk_index, content)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa4001', 0, 'Chunk A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb4001', 0, 'Chunk B');

-- User A
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int
    from core.knowledge_documents
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their documents'
);
select is(
  (
    select count(*)::int
    from core.knowledge_chunks
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their chunks'
);

select throws_like(
  $$insert into core.knowledge_chunks (company_id, document_id, chunk_index, content)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb4001', 1, 'X');$$,
  '%row-level security%',
  'User A cannot insert chunk for Company B'
);

-- User B
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', true);
select is(
  (
    select count(*)::int
    from core.knowledge_documents
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User B sees only their documents'
);

-- Backoffice admin
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccc0001', true);
select set_config('request.jwt.claims', '{"app_metadata":{"role":"backoffice_admin"}}', true);
select is(
  (
    select count(*)::int
    from core.knowledge_documents
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  2,
  'Backoffice admin sees all documents'
);
select is(
  (
    select count(*)::int
    from core.knowledge_chunks
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  2,
  'Backoffice admin sees all chunks'
);

select * from finish();
rollback;
