begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions, core;

select plan(12);

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

insert into core.tool_configs (company_id, centurion_id, tool_name, endpoint, method, input_schema)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001', 'tool_a', 'http://a', 'POST', '{"type":"object"}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'tool_b', 'http://b', 'POST', '{"type":"object"}'::jsonb);

insert into core.mcp_servers (company_id, centurion_id, name, server_url)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001', 'mcp_a', 'http://mcp-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'mcp_b', 'http://mcp-b');

insert into core.followup_rules (company_id, centurion_id, name, inactivity_hours, template)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001', 'rule_a', 24, 'Ping'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'rule_b', 24, 'Ping');

-- User A (company admin)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int
    from core.centurion_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their centurions'
);
select is(
  (
    select count(*)::int
    from core.tool_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their tools'
);
select is(
  (
    select count(*)::int
    from core.mcp_servers
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their MCP servers'
);
select is(
  (
    select count(*)::int
    from core.followup_rules
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User A sees only their followup rules'
);

select throws_like(
  $$insert into core.tool_configs (company_id, centurion_id, tool_name, endpoint, method, input_schema)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'x', 'http://x', 'POST', '{"type":"object"}'::jsonb);$$,
  '%row-level security%',
  'User A cannot insert tool for Company B'
);

select throws_like(
  $$insert into core.followup_rules (company_id, centurion_id, name, inactivity_hours, template)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb1001', 'x', 24, 'Ping');$$,
  '%row-level security%',
  'User A cannot insert followup rule for Company B'
);

-- User B (company admin)
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', true);
select is(
  (
    select count(*)::int
    from core.centurion_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User B sees only their centurions'
);
select is(
  (
    select count(*)::int
    from core.tool_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  1,
  'User B sees only their tools'
);

-- Backoffice admin bypass
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccc0001', true);
select set_config('request.jwt.claims', '{"app_metadata":{"role":"backoffice_admin"}}', true);
select is(
  (
    select count(*)::int
    from core.centurion_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  2,
  'Backoffice admin sees all centurions'
);
select is(
  (
    select count(*)::int
    from core.tool_configs
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  2,
  'Backoffice admin sees all tools'
);
select is(
  (
    select count(*)::int
    from core.mcp_servers
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  2,
  'Backoffice admin sees all MCP servers'
);
select is(
  (
    select count(*)::int
    from core.followup_rules
    where company_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  ),
  2,
  'Backoffice admin sees all followup rules'
);

select * from finish();
rollback;
