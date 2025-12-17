begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions, core;

select plan(9);

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

insert into core.pixel_configs (id, company_id, pixel_id, meta_access_token)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa5001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '12345', 'token-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb5001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '67890', 'token-b');

insert into core.capi_event_logs (company_id, pixel_id, event_name, event_time, event_payload, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '12345', 'Lead', now(), '{}'::jsonb, 'pending'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '67890', 'Lead', now(), '{}'::jsonb, 'pending');

insert into core.contract_templates (id, company_id, name, variables)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa6001', null, 'Global Template', '[]'::jsonb),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa6002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company A Template', '[]'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb6002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Company B Template', '[]'::jsonb);

insert into core.deals_index (company_id, schema_name, local_deal_id, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'schema_a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa7001', 'open'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'schema_b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb7001', 'open');

insert into core.contracts (company_id, template_id, deal_index_id, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa6002', (select id from core.deals_index where company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'draft'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb6002', (select id from core.deals_index where company_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'draft');

insert into core.audit_logs (company_id, action, entity_type, request_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'POST', 'pixels', 'r1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'POST', 'pixels', 'r2');

-- User A
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int
    from core.pixel_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their pixel configs'
);
select is(
  (
    select count(*)::int
    from core.capi_event_logs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their CAPI logs'
);
select is(
  (
    select count(*)::int
    from core.contract_templates
    where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa6001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa6002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb6002')
  ),
  2,
  'User A sees global + their templates'
);
select is(
  (
    select count(*)::int
    from core.contracts
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their contracts'
);
select is(
  (select count(*)::int from core.audit_logs where request_id in ('r1', 'r2')),
  1,
  'User A sees only their audit logs'
);

select throws_like(
  $$insert into core.contract_templates (company_id, name, variables) values (null, 'X', '[]'::jsonb);$$,
  '%row-level security%',
  'User A cannot create global templates'
);

-- Backoffice admin can create global templates and see everything
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccc0001', true);
select set_config('request.jwt.claims', '{"app_metadata":{"role":"backoffice_admin"}}', true);

select lives_ok(
  $$insert into core.contract_templates (company_id, name, variables) values (null, 'New Global', '[]'::jsonb);$$,
  'Backoffice admin can create global templates'
);

select is(
  (
    select count(*)::int
    from core.pixel_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  2,
  'Backoffice admin sees all pixel configs'
);
select is((select count(*)::int from core.audit_logs where request_id in ('r1', 'r2')), 2, 'Backoffice admin sees all audit logs');

select * from finish();
rollback;
