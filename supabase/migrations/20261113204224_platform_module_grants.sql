-- Shared identity does not imply restaurant or application access. The hub uses
-- these explicit module grants alongside existing native Month End memberships.
-- No grants are inferred from existing memberships or email addresses.
create table public.platform_module_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null check (module_key in ('tip-pool', 'month-end')),
  -- TipPool uses a separate Auth project, so its native ID deliberately has no
  -- foreign key to this project's auth.users table.
  native_user_id uuid,
  invitation_token_hash text,
  is_active boolean not null default true,
  granted_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id, module_key)
);

create index platform_module_grants_organization_id_idx
  on public.platform_module_grants(organization_id);
create index platform_module_grants_granted_by_user_id_idx
  on public.platform_module_grants(granted_by_user_id);

comment on table public.platform_module_grants is
  'Explicit shared-hub app access. Does not create or replace native module membership or permissions.';
comment on column public.platform_module_grants.native_user_id is
  'Identity in the native module project; may differ from the shared primary Auth user ID.';

create function private.touch_platform_module_grant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_platform_module_grant() from public, anon, authenticated;
grant execute on function private.touch_platform_module_grant() to service_role;

create trigger platform_module_grants_updated_at
before update on public.platform_module_grants
for each row execute function private.touch_platform_module_grant();

alter table public.platform_module_grants enable row level security;

create policy platform_module_grants_select_own_active
  on public.platform_module_grants for select to authenticated
  using (user_id = (select auth.uid()) and is_active);

-- The trusted invitation broker is the only write path. Browser clients cannot
-- grant, reactivate, reassign, or delete module access, including their own.
revoke all on public.platform_module_grants from public, anon, authenticated;
grant select on public.platform_module_grants to authenticated;
grant select, insert, update, delete on public.platform_module_grants to service_role;

-- Returns only whether the caller has finished initial password setup; never a hash.
create function public.platform_password_ready()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=(select auth.uid())
   and email_confirmed_at is not null and encrypted_password is not null and encrypted_password<>'');
$$;
revoke all on function public.platform_password_ready() from public,anon;
grant execute on function public.platform_password_ready() to authenticated;
