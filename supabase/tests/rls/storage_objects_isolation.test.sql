begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions, core, storage;

select plan(4);

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

insert into storage.buckets (id, name, public)
values ('knowledge_base', 'knowledge_base', false)
on conflict (id) do nothing;

insert into storage.objects (id, bucket_id, name, owner, metadata)
values
  (gen_random_uuid(), 'knowledge_base', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/doc_a.txt', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', '{}'::jsonb),
  (gen_random_uuid(), 'knowledge_base', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/doc_b.txt', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', '{}'::jsonb);

-- User A: company_id claim drives storage RLS
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}}', true);

select is((select count(*)::int from storage.objects where bucket_id = 'knowledge_base'), 1, 'User A sees only their KB objects');

select throws_like(
  $$insert into storage.objects (bucket_id, name, owner, metadata)
    values ('knowledge_base', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/x.txt', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', '{}'::jsonb);$$,
  '%row-level security%',
  'User A cannot insert KB object for Company B prefix'
);

-- User B
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', true);
select set_config('request.jwt.claims', '{"app_metadata":{"company_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'knowledge_base'), 1, 'User B sees only their KB objects');

-- Backoffice admin bypass
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccc0001', true);
select set_config('request.jwt.claims', '{"app_metadata":{"role":"backoffice_admin"}}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'knowledge_base'), 2, 'Backoffice admin sees all KB objects');

select * from finish();
rollback;

