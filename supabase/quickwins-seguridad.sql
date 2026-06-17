-- Quick wins de seguridad (aplicado 2026-06-17, migración
-- `quickwin_harden_app_functions_acl_and_search_path`).
--
-- Contexto: los advisors de Supabase marcaban EXECUTE para PUBLIC/anon sobre las
-- funciones de control de acceso y la falta de search_path en el splitter de migración.
--
-- Las helper app_* las invoca RLS en el contexto del rol que consulta, así que
-- 'authenticated' DEBE conservar EXECUTE (si no, las políticas fallan). Se revoca a
-- PUBLIC y anon (para anon auth.uid() es null => no las necesita).
-- El advisor 0029 (authenticated puede ejecutar SECURITY DEFINER) queda como WARN
-- ESPERADO: es intencional para que evalúen las políticas RLS.

ALTER FUNCTION public.app_split_module_into_v2(text) SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.app_is_active_user()            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.app_is_superadmin()             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.app_can_access_company(text)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.app_can_access_tab(text)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.app_split_module_into_v2(text)  FROM PUBLIC, anon, authenticated;

-- PENDIENTE (no es SQL): activar "Leaked password protection" en
-- Dashboard → Authentication → Policies (1 clic). HaveIBeenPwned.
