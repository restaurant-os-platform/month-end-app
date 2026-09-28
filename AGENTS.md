# Repository instructions

## GitHub-first releases

- This app belongs to `restaurant-os-platform/month-end-app` on GitHub. Keep app changes in this repository; related changes in other apps must be committed to their own repositories.
- GitHub is the source of truth. Run checks, commit, and push before deploying. Never deploy uncommitted local files.
- Use `npm run release:production` from the repository root. It verifies a clean checkout, an exact match with GitHub main, and successful GitHub checks, then deploys a fresh clone of that commit.
- The user chose to keep the current Vercel Hobby plan. Private organization repositories use this GitHub-first release command; do not upgrade plans or make repositories public.
- Keep secrets, local environment files, database backups, identity mappings, and generated caches out of Git. Preserve existing business data and authentication settings.
- See `GITHUB_WORKFLOW.md` for app ownership and release verification.
