# Supabase security review

Date: 2026-06-08

## Scope

This review covers the Supabase access paths used by the React app:

- Auth: email/password login, password recovery, session state.
- Catalogs: `companies`, `app_tabs`.
- Access control: `profiles`, `user_company_permissions`, `user_tab_permissions`.
- Collaboration: `app_active_sessions`, `app_internal_chat_messages`.
- Shared state: `app_state_snapshots`, `app_state_modules`.
- CRM: `crm_clients`, `crm_budgets`.

## Live anon-key read check

Using the public anon key without an authenticated session:

- `companies`: readable, returned 2 rows.
- `app_tabs`: readable, returned 11 rows.
- `profiles`: returned 0 rows.
- `user_company_permissions`: returned 0 rows.
- `user_tab_permissions`: returned 0 rows.
- `app_state_snapshots`: returned 0 rows.
- `app_state_modules`: returned 0 rows.
- `crm_clients`: returned 0 rows.
- `crm_budgets`: returned 0 rows.
- `app_active_sessions`: returned 0 rows.
- `app_internal_chat_messages`: returned 0 rows.

`companies` and `app_tabs` can remain public if they are only non-sensitive catalogs. The 0-row responses on other tables are encouraging, but they do not prove that RLS is complete because empty tables and restrictive RLS can look the same from the anon key.

## Findings

1. The frontend currently reads broad datasets after login:
   - `profiles`
   - `user_company_permissions`
   - `user_tab_permissions`
   - `app_active_sessions`
   - `app_internal_chat_messages`
   - shared app snapshots/modules
   - CRM and budgets

2. Company and tab permissions are enforced mainly in frontend state. Database RLS should mirror those rules so the API cannot be bypassed.

3. `crm_budgets` has a `company` column and can be protected by company permission.

4. `crm_clients` is aggregated by client and uses `company_labels`. This is not strong enough for precise company-level RLS. Prefer adding a normalized `company` or `company_id` column, or a `crm_client_companies` join table.

5. `app_state_snapshots` and `app_state_modules` store broad JSON payloads for the whole app. If users have different company permissions, global snapshots are difficult to secure per company. The safer long-term design is module/company-scoped persistence.

6. Chat read receipts are updated by writing the full `read_by` array. RLS can limit updates to visible messages, but it cannot easily prove only `read_by` changed without a trigger or RPC.

7. Debug console logs that exposed Supabase profile, permission, login, and catalog data were removed from the frontend.

## Recommended next steps

1. Review `supabase/rls-policies.sql` in the Supabase SQL editor.
2. Confirm actual column types and constraints before executing.
3. Run the SQL in a staging copy or during a quiet period.
4. Test with one superadmin user and one restricted user.
5. Refactor `crm_clients` and app-state persistence for stronger company-level isolation.

