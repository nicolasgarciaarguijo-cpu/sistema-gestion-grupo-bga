# Preflight checks

Use this check before publishing to Vercel or before starting a round of changes.
It validates the local environment variables, the expected Supabase tables and the
local dev server when it is running.

```bash
npm run preflight
```

The script intentionally masks the Supabase anon key and never prints tokens.

## What it checks

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- optional `REACT_APP_SUPABASE_AUTH_REDIRECT_URL`
- Supabase tables used by the app:
  - `companies`
  - `app_tabs`
  - `profiles`
  - `user_company_permissions`
  - `user_tab_permissions`
  - `app_state_snapshots`
  - `app_state_modules`
  - `crm_clients`
  - `crm_budgets`
  - `app_active_sessions`
  - `app_internal_chat_messages`
- `http://localhost:3000`, when the local server is running.

## Reading the result

`[OK]` means the check passed.

`[WARN]` means something should be reviewed, but it may be expected. For example,
localhost can be down if the dev server is not running.

`[FAIL]` means the app should not be deployed or tested yet. Fix the failing
environment variable, table, or column first.
