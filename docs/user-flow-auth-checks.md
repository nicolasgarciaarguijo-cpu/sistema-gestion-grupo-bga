# User flow auth checks

This is the point 4 validation: test real Supabase users before a deploy.
Use one superadmin user and one restricted user.

## Credentials

Do not paste passwords in chat and do not commit them.

Create this ignored local file:

```bash
.env.auth.local
```

Example:

```bash
SUPABASE_TEST_ADMIN_EMAIL=admin@example.com
SUPABASE_TEST_ADMIN_PASSWORD=your-admin-password
SUPABASE_TEST_RESTRICTED_EMAIL=user@example.com
SUPABASE_TEST_RESTRICTED_PASSWORD=your-user-password

SUPABASE_TEST_RESTRICTED_EXPECT_COMPANIES=BGA
SUPABASE_TEST_RESTRICTED_DENY_COMPANIES=De raiz
SUPABASE_TEST_RESTRICTED_EXPECT_TABS=presupuesto,historial
SUPABASE_TEST_RESTRICTED_DENY_TABS=personal
```

`.env.auth.local` is covered by `.env.*.local` in `.gitignore`.

## Run

```bash
npm run auth-smoke
```

The script verifies:

- both users can sign in with Supabase Auth
- the superadmin profile has `is_superadmin=true`
- the restricted profile is not superadmin
- the restricted user has expected company permissions
- the restricted user has expected tab permissions
- denied companies and tabs are not exposed in calculated app access
- authenticated reads work for collaboration, saved state and CRM tables

The script is read-only. It does not save, update or delete production data.

## Manual UI pass

After the script passes locally:

1. Open `http://localhost:3000`.
2. Log in as the restricted user.
3. Confirm the sidebar only shows the expected tabs plus `Acceso`.
4. Confirm company selectors do not show denied companies.
5. Log out.
6. Log in as the superadmin.
7. Confirm all tabs and all active companies are visible.
8. Use `Guardar en Supabase` only when you intentionally want to write real data.

Repeat the same pass in Vercel after redeploy.
