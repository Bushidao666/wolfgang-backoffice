begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions, core;

select plan(5);

-- Arrange
insert into core.companies (id, name, slug, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company A', 'company-a', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Company B', 'company-b', 'active');

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'authenticated', 'authenticated', 'a@example.com', '{}'::jsonb, '{}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'authenticated', 'authenticated', 'b@example.com', '{}'::jsonb, '{}'::jsonb);

insert into core.company_users (company_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 'admin');

insert into core.leads (company_id, phone, lifecycle_stage)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+10000000001', 'new'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+20000000002', 'new');

-- Act/Assert: user A
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*)::int from core.leads), 1, 'User A sees only leads from Company A');
select is((select count(*)::int from core.leads where company_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0, 'User A sees 0 leads from Company B');

select throws_like(
  $$insert into core.leads (company_id, phone, lifecycle_stage) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+30000000003', 'new');$$,
  '%row-level security%',
  'User A cannot insert lead for Company B'
);

-- Act/Assert: user B
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', true);

select is((select count(*)::int from core.leads), 1, 'User B sees only leads from Company B');
select is((select count(*)::int from core.leads where company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0, 'User B sees 0 leads from Company A');

select * from finish();
rollback;
