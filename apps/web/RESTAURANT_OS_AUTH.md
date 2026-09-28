# Restaurant OS shared login

The integration is opt-in until the shared identity provider is configured. Existing account IDs, workspace memberships, passwords, and database URLs remain unchanged.

Server environment:

```dotenv
RESTAURANT_OS_SSO_ENABLED=false
RESTAURANT_OS_URL=http://localhost:3000
RESTAURANT_OS_MODULE_URL=http://localhost:3001
RESTAURANT_OS_OAUTH_PROVIDER=custom:restaurant-os
RESTAURANT_OS_LOGOUT_NEXT_URL=http://localhost:3002/auth/restaurant-os/logout
RESTAURANT_OS_RESTAURANT_MAP={"540419a9-075f-4dd2-8c03-510bc07d9d58":"4572de33-cf34-43f9-89e2-22fdf8233ae9"}
```

Register the custom OIDC provider in this module's existing Supabase Auth project, using the selected Restaurant OS issuer and a dedicated confidential client. Register this module's `/auth/restaurant-os/callback` in Supabase's application redirect allowlist. Only then enable `RESTAURANT_OS_SSO_ENABLED`.

The module uses native Supabase PKCE exchange and then verifies active memberships. Verify that an existing user keeps their original module user ID. Different account emails require explicit verified identity linking; do not create broad access grants to work around mismatches.

Full setup and acceptance checks are maintained in Restaurant OS `phase-2/decision-008-shared-login.md`. Use HTTPS production URLs and the fixed logout chain Restaurant OS → Month End → Tip Pool → Restaurant OS login.

Keep the existing Supabase Site URL. The new `/oauth/authorize` route forwards only the authorization request ID to the configured platform, preserving recovery and invitation defaults. Deploy this route before using the OAuth server. The restaurant map connects the shared Keg identity to its existing Month End organization; access still requires an active native membership.
