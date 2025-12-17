begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions, core;

select plan(4);

insert into core.companies (id, name, slug, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company A', 'company-a', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Company B', 'company-b', 'active');

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  ('cccccccc-cccc-cccc-cccc-cccccccc0001', 'authenticated', 'authenticated', 'admin@example.com',
   '{"role":"backoffice_admin"}'::jsonb, '{}'::jsonb);

insert into core.leads (company_id, phone, lifecycle_stage)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+10000000001', 'new'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+20000000002', 'new');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccc0001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"app_metadata":{"role":"backoffice_admin"}}', true);

select is(
  (select count(*)::int from core.leads where phone in ('+10000000001', '+20000000002')),
  2,
  'Backoffice admin sees all leads'
);
select is(
  (select count(*)::int from core.companies where slug in ('company-a', 'company-b')),
  2,
  'Backoffice admin sees companies A and B'
);

select is(
  (select core.is_backoffice_admin()),
  true,
  'core.is_backoffice_admin() is true'
);

select lives_ok(
  $$insert into core.companies (name, slug, status) values ('X', 'company-x', 'active');$$,
  'Backoffice admin can create companies'
);

select * from finish();
rollback;
