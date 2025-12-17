begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions, core;

select plan(7);

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

insert into core.centurion_configs (id, company_id, name, slug, prompt)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SDR A', 'sdr_a', 'Prompt A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'SDR B', 'sdr_b', 'Prompt B');

insert into core.leads (id, company_id, phone, lifecycle_stage)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+10000000001', 'new'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+20000000002', 'new');

insert into core.conversations (id, company_id, lead_id, centurion_id, channel_type)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa3001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001', 'whatsapp'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb3001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'whatsapp');

insert into core.messages (company_id, lead_id, conversation_id, direction, content_type, content)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa3001', 'inbound', 'text', 'Hi A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb3001', 'inbound', 'text', 'Hi B');

insert into core.lead_memories (company_id, lead_id, summary)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', 'Summary A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001', 'Summary B');

insert into core.lead_graphs (company_id, lead_id, context)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', '{}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001', '{}'::jsonb);

-- User A (company admin)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int
    from core.conversations
    where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa3001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb3001')
  ),
  1,
  'User A sees only their conversations'
);
select is(
  (
    select count(*)::int
    from core.messages
    where conversation_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa3001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb3001')
  ),
  1,
  'User A sees only their messages'
);
select is(
  (
    select count(*)::int
    from core.lead_memories
    where lead_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001')
  ),
  1,
  'User A sees only their memories'
);
select is(
  (
    select count(*)::int
    from core.lead_graphs
    where lead_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001')
  ),
  1,
  'User A sees only their graphs'
);

select throws_like(
  $$insert into core.conversations (company_id, lead_id, centurion_id, channel_type)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb2001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'whatsapp');$$,
  '%row-level security%',
  'User A cannot insert conversation for Company B'
);

-- User B (company admin)
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', true);
select is(
  (
    select count(*)::int
    from core.messages
    where conversation_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa3001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb3001')
  ),
  1,
  'User B sees only their messages'
);

-- Backoffice admin sees all messages
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccc0001', true);
select set_config('request.jwt.claims', '{"app_metadata":{"role":"backoffice_admin"}}', true);
select is(
  (
    select count(*)::int
    from core.messages
    where conversation_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa3001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb3001')
  ),
  2,
  'Backoffice admin sees all messages'
);

select * from finish();
rollback;
