begin;

select plan(30);

select has_table('public', 'platform_module_grants', 'shared app access is explicit');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_module_grants'::regclass),
  'module grants enforce row-level security'
);
select ok(has_table_privilege('authenticated', 'public.platform_module_grants', 'select'), 'authenticated users can query their grants');
select ok(not has_table_privilege('authenticated', 'public.platform_module_grants', 'insert'), 'users cannot grant themselves an app');
select ok(not has_table_privilege('authenticated', 'public.platform_module_grants', 'update'), 'users cannot reactivate or reassign an app');
select ok(not has_table_privilege('authenticated', 'public.platform_module_grants', 'delete'), 'users cannot delete app access');
select ok(not has_table_privilege('anon', 'public.platform_module_grants', 'select'), 'anonymous clients cannot enumerate app access');
select ok(has_table_privilege('service_role', 'public.platform_module_grants', 'select'), 'the trusted broker can inspect grants');
select ok(has_table_privilege('service_role', 'public.platform_module_grants', 'insert'), 'the trusted broker can create grants');
select ok(has_table_privilege('service_role', 'public.platform_module_grants', 'update'), 'the trusted broker can update grants');
select ok(has_table_privilege('service_role', 'public.platform_module_grants', 'delete'), 'the trusted broker can revoke grants');

insert into auth.users (id, email) values
  ('12000000-0000-0000-0000-000000000001', 'module-only@first.example.test'),
  ('12000000-0000-0000-0000-000000000002', 'module-only@second.example.test');

insert into public.organizations (id, name, slug, created_by) values
  ('22000000-0000-0000-0000-000000000001', 'First Module Test', 'first-module-test', '12000000-0000-0000-0000-000000000001'),
  ('22000000-0000-0000-0000-000000000002', 'Second Module Test', 'second-module-test', '12000000-0000-0000-0000-000000000002');

insert into public.platform_module_grants (user_id, organization_id, module_key, native_user_id, is_active, updated_at) values
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'tip-pool', '92000000-0000-0000-0000-000000000001', true, '2000-01-01'),
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'month-end', null, true, '2000-01-01'),
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'month-end', null, false, '2000-01-01'),
  ('12000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'tip-pool', null, true, '2000-01-01');

set local role authenticated;
set local request.jwt.claims = '{"sub":"12000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*)::integer from public.platform_module_grants), 2, 'a user sees only their active module grants');
select is((select count(*)::integer from public.platform_module_grants where user_id = '12000000-0000-0000-0000-000000000002'), 0, 'another user grants remain private');
select is((select count(*)::integer from public.platform_module_grants where not is_active), 0, 'inactive grants remain hidden');
select is((select count(*)::integer from public.memberships), 0, 'module grants do not create native Month End membership');
select is((select count(*)::integer from public.organizations), 0, 'module grants do not expose native Month End organizations');
select throws_ok(
  $$ insert into public.platform_module_grants (user_id, organization_id, module_key)
     values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'month-end') $$,
  '42501', null, 'a user cannot insert app access'
);
select throws_ok(
  $$ update public.platform_module_grants set is_active = true $$,
  '42501', null, 'a user cannot reactivate app access'
);
select throws_ok(
  $$ delete from public.platform_module_grants $$,
  '42501', null, 'a user cannot delete app access'
);

set local request.jwt.claims = '{"sub":"12000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*)::integer from public.platform_module_grants), 1, 'a second user receives only their own grant');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  $$ select * from public.platform_module_grants $$,
  '42501', null, 'an anonymous request cannot read grants'
);

reset role;
select throws_ok(
  $$ insert into public.platform_module_grants (user_id, organization_id, module_key)
     values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'unknown-app') $$,
  '23514', null, 'only supported module names are accepted'
);
select throws_ok(
  $$ insert into public.platform_module_grants (user_id, organization_id, module_key)
     values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'tip-pool') $$,
  '23505', null, 'module grants are unique per user and organization'
);
select throws_ok(
  $$ insert into public.platform_module_grants (user_id, organization_id, module_key)
     values ('12000000-0000-0000-0000-000000000099', '22000000-0000-0000-0000-000000000001', 'tip-pool') $$,
  '23503', null, 'shared user IDs must exist in the primary Auth project'
);
select throws_ok(
  $$ insert into public.platform_module_grants (user_id, organization_id, module_key)
     values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000099', 'tip-pool') $$,
  '23503', null, 'shared organization IDs must exist in the primary project'
);

set local role service_role;
select lives_ok(
  $$ insert into public.platform_module_grants (user_id, organization_id, module_key)
     values ('12000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'month-end') $$,
  'the trusted broker can persist a grant'
);
select lives_ok(
  $$ update public.platform_module_grants set native_user_id = '92000000-0000-0000-0000-000000000002'
     where user_id = '12000000-0000-0000-0000-000000000001' and module_key = 'tip-pool' $$,
  'the trusted broker can link a separate native Auth identity'
);
select ok(
  (select updated_at > '2000-01-01'::timestamptz from public.platform_module_grants
   where user_id = '12000000-0000-0000-0000-000000000001' and module_key = 'tip-pool'),
  'grant updates refresh their timestamp'
);
select lives_ok(
  $$ delete from public.platform_module_grants
     where user_id = '12000000-0000-0000-0000-000000000002' and module_key = 'month-end' $$,
  'the trusted broker can remove a grant'
);

reset role;
select is(
  (select count(*)::integer from public.memberships where user_id in ('12000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002')),
  0, 'broker grant operations leave native memberships unchanged'
);

select * from finish();
rollback;
