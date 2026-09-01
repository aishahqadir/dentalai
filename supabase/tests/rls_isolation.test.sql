-- RLS isolation test (pgTAP). Repo path: supabase/tests/rls_isolation.test.sql
-- Run with `supabase test db`.
--
-- Verifies that current_practice_id() and the practice-scoped policies stop one
-- practice from reading or writing another practice's rows. Seeds run as the
-- postgres role, which bypasses RLS. Assertions run as the authenticated role
-- with a simulated JWT, so the policies actually apply.
--
-- Assumes Supabase's default table grants for the authenticated role.

begin;
select plan(8);

-- Seed two practices, two users, two connections, two plans, two items.
insert into practices (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Practice A'),
  ('22222222-2222-2222-2222-222222222222', 'Practice B');

insert into app_users (id, practice_id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'a@a.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'b@b.test');

insert into pms_connections (id, practice_id, region, credentials) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'UK', 'x'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'UK', 'x');

insert into treatment_plans (id, practice_id, pms_connection_id, pms_plan_id, patient_ref) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'PA', 'patA'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'PB', 'patB');

insert into treatment_plan_items (id, plan_id, practice_id, value_pence) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 1000),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 2000);

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is(
  current_practice_id(),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'current_practice_id resolves to practice A for user A'
);

select is(
  (select count(*) from treatment_plans)::int, 1,
  'user A sees exactly one plan, their own'
);

select is(
  (select count(*) from treatment_plans where practice_id = '22222222-2222-2222-2222-222222222222')::int, 0,
  'user A sees no practice B plans'
);

select is(
  (select count(*) from treatment_plan_items)::int, 1,
  'user A sees exactly one item, their own'
);

select throws_ok(
  $$insert into treatment_plans (practice_id, pms_connection_id, pms_plan_id, patient_ref)
    values ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'PX', 'patX')$$,
  '42501',
  null,
  'user A cannot insert a row scoped to practice B'
);

-- Switch to user B.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select is(
  current_practice_id(),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'current_practice_id resolves to practice B for user B'
);

select is(
  (select count(*) from treatment_plans)::int, 1,
  'user B sees exactly one plan, their own'
);

select is(
  (select count(*) from treatment_plans where practice_id = '11111111-1111-1111-1111-111111111111')::int, 0,
  'user B sees no practice A plans'
);

select * from finish();
rollback;
