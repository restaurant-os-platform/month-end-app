# GitHub-first application releases

GitHub is the source of truth for all three applications. Each repository owns its code and validation. Shared-login changes that span modules require a commit and checks in every affected repository.

| App | GitHub repository | Vercel project |
| --- | --- | --- |
| Restaurant OS / Endvora | [restaurant-os](https://github.com/restaurant-os-platform/restaurant-os) | restaurant-os |
| Month’s End | [month-end-app](https://github.com/restaurant-os-platform/month-end-app) | month-end-app |
| TipPool | [tip-pool](https://github.com/restaurant-os-platform/tip-pool) | tip-pool |

## Release

1. Make the change in the owning repository. Run its tests, type check, lint, and build.
2. Commit and push to GitHub. Wait for the push workflow to pass.
3. Run `npm run release:production` from the repository root. This command verifies that local HEAD is already GitHub main, checks successful GitHub workflow results, clones that exact source from GitHub, and deploys the clean clone. `npm run release:production -- --check` verifies prerequisites without deploying.
4. Verify the deployment commit and the affected live behavior. For Month’s End, verify through `https://endvora.com/month-end`, not just the underlying deployment URL.

The release command requires GitHub CLI and existing Vercel CLI authentication. It does not copy `.env.local` or other ignored local files. Production configuration comes from the existing Vercel project. Secrets and database backups are never committed.

## Current hosting plan

The user chose to retain Vercel Hobby. Native Git integration cannot connect private organization repositories on this plan. Restaurant OS and TipPool therefore use the release command after GitHub checks pass. Month’s End is public and also has native GitHub deployment integration; avoid a duplicate manual deployment when its Git deployment already succeeded for the same commit. No paid plan change or repository visibility change is needed.

Website releases do not automatically apply database migrations or deploy Supabase Edge Functions. Such changes must first be versioned in the owning repository and applied separately with appropriate validation. Database consolidation remains a separate task; publishing source does not activate it.
