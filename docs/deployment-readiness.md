# Deployment readiness

This is the final local checkpoint before pushing to GitHub and redeploying in
Vercel.

```bash
npm run release-check
```

## What release-check does

1. Runs `npm run preflight`.
2. Runs `npm run auth-smoke` only when `.env.auth.local` has both test users.
3. Runs `npm run build`.

If test-user credentials are missing, the command finishes with exit code `2`.
That means the app can still compile, but the user-permission flow is not fully
validated yet.

## What must be loaded before the final pass

Local files:

- `.env.local`
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`
  - `REACT_APP_SUPABASE_AUTH_REDIRECT_URL`
- `.env.auth.local`
  - `SUPABASE_TEST_ADMIN_EMAIL`
  - `SUPABASE_TEST_ADMIN_PASSWORD`
  - `SUPABASE_TEST_RESTRICTED_EMAIL`
  - `SUPABASE_TEST_RESTRICTED_PASSWORD`
  - expected and denied companies/tabs for the restricted user

Vercel environment variables:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_SUPABASE_AUTH_REDIRECT_URL`

Supabase:

- Review `supabase/rls-policies.sql` before running it.
- Confirm the real column types in the SQL editor.
- Test with one superadmin and one restricted user after any RLS change.

## Final order

1. Complete `.env.auth.local` locally.
2. Run `npm run release-check`.
3. Push the branch/commit to GitHub.
4. Confirm Vercel has the required environment variables.
5. Redeploy in Vercel.
6. Test the restricted user in Vercel.
7. Test the superadmin user in Vercel.
8. Only then treat the deployment as ready for daily use.
