# Shared identity and module invitations

Endvora uses this project's Auth identity for the shared sign-in. TipPool keeps
its separate native Auth project and restaurant permissions. A shared identity
does not grant either app automatically, and passwords must never be copied
between projects.

`public.platform_module_grants` records explicit shared-hub module access:

- Primary key: `user_id`, `organization_id`, `module_key`.
- `module_key` is `tip-pool` or `month-end`.
- `native_user_id` may identify a user in another project's Auth service.
- `is_active` controls the shared-hub grant.
- `granted_by_user_id`, `created_at`, and `updated_at` record attribution.

Authenticated users can read only their own active grants. Anonymous users have
no access. Only the trusted server broker, using the primary project's service
role, can write grants. Existing Month End memberships are not backfilled into
TipPool grants. A module grant does not create a Month End membership or bypass
the native access checks, including suspended memberships and department scope.
Native module permissions remain authoritative after the app is opened.

The hub must obtain restaurant labels from its own trusted registry. A TipPool
grant intentionally does not expose `public.organizations` or other Month End
restaurant data to a user without native Month End membership.

## Explicit Month End selection

Use the existing native invitation API when Month End is selected. The central
invitation page authenticates the inviter with their **primary Auth JWT**. The
broker must call `public.create_team_invitation` under that JWT, rather than
inserting memberships with service-role privileges. A TipPool-native JWT is not
a substitute for a primary-project session.

```ts
const token = crypto.randomUUID() + crypto.randomUUID(); // Store/send as a secret.
const tokenHash = sha256(token); // 64-character hexadecimal SHA-256 digest.
const { data: invitationId, error } = await primaryActorClient.rpc(
  "create_team_invitation",
  {
    p_organization_id: verifiedPrimaryOrganizationId,
    p_email: invitedEmail.trim().toLowerCase(),
    p_display_name: invitedDisplayName.trim(),
    p_role: selectedMonthEndRole, // admin | manager | staff
    p_token_hash: tokenHash,
    p_department_ids: selectedNativeDepartmentIds,
    p_permission_keys: selectedNativePermissionKeys,
    p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
);
```

The native database requires an active inviter membership for this organization.
Owners may invite admins, managers, or staff; admins may invite managers or
staff; managers may invite only staff within their department scope and only
assign permissions marked manager-assignable. Invalid departments, permissions,
roles, expired invitations, and already-existing memberships are rejected. An
inviter without native Month End authority must be directed to a Month End
administrator. TipPool access must not imply that authority.

After verifying the invitation email, the recipient accepts under their own
primary Auth JWT:

```ts
await primaryRecipientClient.rpc("accept_team_invitation", {
  p_token_hash: sha256(token),
});
```

This API locks and validates the pending invitation, expiry, and the exact
authenticated primary email before applying native membership, departments,
permissions, attribution, and audit records. A hub module grant may be recorded
after successful native acceptance. An active native Month End membership
continues to permit Month End in the hub for backward compatibility.

The existing `/invite/[token]` signed-in acceptance path can be used without
changing a returning user's password. Its legacy emailed `ready=1` setup path
requires a password change; do not use that path for existing shared identities
in the new broker flow. Only a newly created primary account marked by trusted
app metadata as requiring initial password setup should set a password in the
shared invitation acceptance flow.

## Rollout and verification

Apply the migration to the primary project, configure the reviewed broker and
allowlisted native project, and deploy the coordinated app commits only after
explicit approval. Do not switch Supabase projects, copy credentials, or grant
native memberships as part of rollout. The migration contains no backfill and
does not change current memberships, permissions, financial data, or saved work.

`supabase/tests/platform_module_grants_test.sql` covers self-only active reads,
anonymous and browser write denial, trusted broker writes, foreign keys,
uniqueness, timestamps, and absence of implicit native Month End access. Run it
in a disposable local Supabase database; it rolls all sample records back.
