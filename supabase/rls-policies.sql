-- Supabase RLS baseline for Sistema de Gestion Grupo BGA.
-- Review column types and existing policies before running this in Supabase.
-- This file is intentionally not executed by the app.

-- Helper: active authenticated user.
create or replace function public.app_is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id::text = (select auth.uid())::text
      and coalesce(p.active, true)
  );
$$;

-- Helper: superadmin profile.
create or replace function public.app_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id::text = (select auth.uid())::text
      and coalesce(p.active, true)
      and coalesce(p.is_superadmin, false)
  );
$$;

-- Helper: company access by company name.
create or replace function public.app_can_access_company(company_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.app_is_active_user())
    and (
      (select public.app_is_superadmin())
      or exists (
        select 1
        from public.user_company_permissions ucp
        join public.companies c on c.id = ucp.company_id
        where ucp.user_id::text = (select auth.uid())::text
          and c.name = company_name
          and coalesce(c.active, true)
      )
    );
$$;

-- Helper: tab access by tab key.
create or replace function public.app_can_access_tab(tab_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.app_is_active_user())
    and (
      (select public.app_is_superadmin())
      or exists (
        select 1
        from public.user_tab_permissions utp
        where utp.user_id::text = (select auth.uid())::text
          and utp.tab_key = tab_key
      )
    );
$$;

-- Public catalogs. Keep these public only if they contain no sensitive data.
alter table if exists public.companies enable row level security;
alter table if exists public.app_tabs enable row level security;

drop policy if exists companies_public_read on public.companies;
create policy companies_public_read
on public.companies
for select
to anon, authenticated
using (coalesce(active, true));

drop policy if exists app_tabs_public_read on public.app_tabs;
create policy app_tabs_public_read
on public.app_tabs
for select
to anon, authenticated
using (coalesce(active, true));

-- Profiles and permission tables.
alter table if exists public.profiles enable row level security;
alter table if exists public.user_company_permissions enable row level security;
alter table if exists public.user_tab_permissions enable row level security;

drop policy if exists profiles_authenticated_directory_read on public.profiles;
create policy profiles_authenticated_directory_read
on public.profiles
for select
to authenticated
using ((select public.app_is_active_user()));

-- No profile write policy is created here. Profile changes should be handled
-- by an admin-only workflow or a trusted server function.

drop policy if exists user_company_permissions_self_or_admin_read on public.user_company_permissions;
create policy user_company_permissions_self_or_admin_read
on public.user_company_permissions
for select
to authenticated
using (
  user_id::text = (select auth.uid())::text
  or (select public.app_is_superadmin())
);

drop policy if exists user_tab_permissions_self_or_admin_read on public.user_tab_permissions;
create policy user_tab_permissions_self_or_admin_read
on public.user_tab_permissions
for select
to authenticated
using (
  user_id::text = (select auth.uid())::text
  or (select public.app_is_superadmin())
);

-- Shared app state. Current app design stores broad JSON state.
-- This is authenticated-only as a baseline; stricter company-level RLS needs a data model change.
alter table if exists public.app_state_snapshots enable row level security;
alter table if exists public.app_state_modules enable row level security;

drop policy if exists app_state_snapshots_authenticated_read on public.app_state_snapshots;
create policy app_state_snapshots_authenticated_read
on public.app_state_snapshots
for select
to authenticated
using ((select public.app_is_active_user()));

drop policy if exists app_state_snapshots_authenticated_write on public.app_state_snapshots;
create policy app_state_snapshots_authenticated_write
on public.app_state_snapshots
for insert
to authenticated
with check ((select public.app_is_active_user()));

drop policy if exists app_state_snapshots_authenticated_update on public.app_state_snapshots;
create policy app_state_snapshots_authenticated_update
on public.app_state_snapshots
for update
to authenticated
using ((select public.app_is_active_user()))
with check ((select public.app_is_active_user()));

drop policy if exists app_state_modules_authenticated_read on public.app_state_modules;
create policy app_state_modules_authenticated_read
on public.app_state_modules
for select
to authenticated
using ((select public.app_is_active_user()));

drop policy if exists app_state_modules_authenticated_insert on public.app_state_modules;
create policy app_state_modules_authenticated_insert
on public.app_state_modules
for insert
to authenticated
with check ((select public.app_is_active_user()));

drop policy if exists app_state_modules_authenticated_update on public.app_state_modules;
create policy app_state_modules_authenticated_update
on public.app_state_modules
for update
to authenticated
using ((select public.app_is_active_user()))
with check ((select public.app_is_active_user()));

-- CRM budgets: protect by budget company.
alter table if exists public.crm_budgets enable row level security;

drop policy if exists crm_budgets_company_read on public.crm_budgets;
create policy crm_budgets_company_read
on public.crm_budgets
for select
to authenticated
using ((select public.app_can_access_company(company)));

drop policy if exists crm_budgets_company_insert on public.crm_budgets;
create policy crm_budgets_company_insert
on public.crm_budgets
for insert
to authenticated
with check (
  updated_by::text = (select auth.uid())::text
  and (select public.app_can_access_company(company))
);

drop policy if exists crm_budgets_company_update on public.crm_budgets;
create policy crm_budgets_company_update
on public.crm_budgets
for update
to authenticated
using ((select public.app_can_access_company(company)))
with check (
  updated_by::text = (select auth.uid())::text
  and (select public.app_can_access_company(company))
);

drop policy if exists crm_budgets_admin_delete on public.crm_budgets;
create policy crm_budgets_admin_delete
on public.crm_budgets
for delete
to authenticated
using ((select public.app_is_superadmin()));

-- CRM clients: interim authenticated-only policy.
-- Strong company-level RLS requires a normalized company/company_id relationship.
alter table if exists public.crm_clients enable row level security;

drop policy if exists crm_clients_authenticated_read on public.crm_clients;
create policy crm_clients_authenticated_read
on public.crm_clients
for select
to authenticated
using ((select public.app_is_active_user()));

drop policy if exists crm_clients_authenticated_insert on public.crm_clients;
create policy crm_clients_authenticated_insert
on public.crm_clients
for insert
to authenticated
with check (
  updated_by::text = (select auth.uid())::text
  and (select public.app_is_active_user())
);

drop policy if exists crm_clients_authenticated_update on public.crm_clients;
create policy crm_clients_authenticated_update
on public.crm_clients
for update
to authenticated
using ((select public.app_is_active_user()))
with check (
  updated_by::text = (select auth.uid())::text
  and (select public.app_is_active_user())
);

drop policy if exists crm_clients_admin_delete on public.crm_clients;
create policy crm_clients_admin_delete
on public.crm_clients
for delete
to authenticated
using ((select public.app_is_superadmin()));

-- Presence.
alter table if exists public.app_active_sessions enable row level security;

drop policy if exists app_active_sessions_authenticated_read on public.app_active_sessions;
create policy app_active_sessions_authenticated_read
on public.app_active_sessions
for select
to authenticated
using ((select public.app_is_active_user()));

drop policy if exists app_active_sessions_own_insert on public.app_active_sessions;
create policy app_active_sessions_own_insert
on public.app_active_sessions
for insert
to authenticated
with check (user_id::text = (select auth.uid())::text);

drop policy if exists app_active_sessions_own_update on public.app_active_sessions;
create policy app_active_sessions_own_update
on public.app_active_sessions
for update
to authenticated
using (user_id::text = (select auth.uid())::text)
with check (user_id::text = (select auth.uid())::text);

drop policy if exists app_active_sessions_own_delete on public.app_active_sessions;
create policy app_active_sessions_own_delete
on public.app_active_sessions
for delete
to authenticated
using (user_id::text = (select auth.uid())::text);

-- Internal chat.
alter table if exists public.app_internal_chat_messages enable row level security;

drop policy if exists app_internal_chat_visible_read on public.app_internal_chat_messages;
create policy app_internal_chat_visible_read
on public.app_internal_chat_messages
for select
to authenticated
using (
  (select public.app_is_active_user())
  and (
    recipient_user_id is null
    or recipient_user_id::text = (select auth.uid())::text
    or user_id::text = (select auth.uid())::text
  )
);

drop policy if exists app_internal_chat_own_insert on public.app_internal_chat_messages;
create policy app_internal_chat_own_insert
on public.app_internal_chat_messages
for insert
to authenticated
with check (
  user_id::text = (select auth.uid())::text
  and (select public.app_is_active_user())
);

drop policy if exists app_internal_chat_visible_update on public.app_internal_chat_messages;
create policy app_internal_chat_visible_update
on public.app_internal_chat_messages
for update
to authenticated
using (
  (select public.app_is_active_user())
  and (
    recipient_user_id is null
    or recipient_user_id::text = (select auth.uid())::text
    or user_id::text = (select auth.uid())::text
  )
)
with check (
  recipient_user_id is null
  or recipient_user_id::text = (select auth.uid())::text
  or user_id::text = (select auth.uid())::text
);

-- Helpful indexes for RLS lookups.
create index if not exists profiles_id_active_idx on public.profiles (id, active);
create index if not exists user_company_permissions_user_id_idx on public.user_company_permissions (user_id);
create index if not exists user_company_permissions_company_id_idx on public.user_company_permissions (company_id);
create index if not exists user_tab_permissions_user_id_idx on public.user_tab_permissions (user_id);
create index if not exists crm_budgets_company_idx on public.crm_budgets (company);
create index if not exists app_active_sessions_user_id_idx on public.app_active_sessions (user_id);
create index if not exists app_internal_chat_messages_user_id_idx on public.app_internal_chat_messages (user_id);
create index if not exists app_internal_chat_messages_recipient_user_id_idx on public.app_internal_chat_messages (recipient_user_id);
