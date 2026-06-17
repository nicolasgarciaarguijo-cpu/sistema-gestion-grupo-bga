-- ============================================================================
-- Aislamiento por empresa — Fases 2 y 3  (APLICADO en producción 2026-06-17)
-- Proyecto Supabase: ilmcvnnawzorvzpwpoes
-- ============================================================================
-- Este archivo documenta lo que se aplicó (migraciones registradas en Supabase:
--   fase2_v2_table_and_split_function, fase3_rls_app_state_modules_v2).
-- La Fase 1 (funciones de ayuda) ya estaba aplicada antes
-- (migración fase1_helper_functions_access_control).
--
-- Decisiones: tabla nueva app_state_modules_v2 que COEXISTE con app_state_modules
-- (el frontend actual sigue usando la vieja hasta la Fase 4); marcadores -> General;
-- mojibake del nombre de BGA ('diseÃ±o'->'diseño') normalizado a nivel texto.
--
-- Backup previo: esquema `backups` (no expuesto a la API):
--   backups.app_state_modules_20260617, backups.app_state_snapshots_20260617.
-- Validación sobre datos reales: 252=252 ítems sin pérdida, 0 mojibake, 26 filas, 12 módulos.
-- Rollback: drop table public.app_state_modules_v2;  (la tabla viva queda intacta)
-- ============================================================================


-- ---- Fase 2 ----------------------------------------------------------------
create table if not exists public.app_state_modules_v2 (
  module_key text not null,
  company    text not null,            -- companies.name o 'General' (compartido)
  payload    jsonb not null,           -- { moduleKey, moduleLabel, version, savedAt, data:{...} }
  saved_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key (module_key, company)
);

-- Particiona UN módulo en filas (module_key, company). Idempotente. Set-based (jsonb_agg)
-- para no morir en O(n^2) con el módulo grande (historial-crm ~23MB).
create or replace function public.app_split_module_into_v2(p_module_key text)
returns int
language plpgsql
as $$
declare
  bga text := 'BGA estudio de diseño y produccion industrial s.r.l';
  deraiz text := 'De raiz s.r.l';
  per_company_keys text[] := array[
    'archivos|companyAssets','caja-chica|pettyCashExpenses','caja-chica|pettyCashFunds',
    'cash-flow|debtPlans','cash-flow|financialItems','compras|purchaseInvoices',
    'historial-crm|savedBudgets','personal|employees','stock-costos|costAnalysisGroups',
    'stock-costos|stockItems','trabajos-aprobados|approvedJobs'];
  rec record; payload_fix jsonb; data_obj jsonb; envelope jsonb; k text; v jsonb;
  data_general jsonb := '{}'::jsonb; data_bga jsonb := '{}'::jsonb; data_deraiz jsonb := '{}'::jsonb;
  a_bga jsonb; a_deraiz jsonb; a_general jsonb; n int := 0;
begin
  select * into rec from public.app_state_modules where module_key = p_module_key;
  if not found then return 0; end if;
  payload_fix := replace(rec.payload::text,'diseÃ±o','diseño')::jsonb;   -- normaliza mojibake en TODO el payload
  data_obj := coalesce(payload_fix->'data','{}'::jsonb);
  envelope := payload_fix - 'data';

  for k, v in select * from jsonb_each(data_obj) loop
    if (p_module_key||'|'||k) = any(per_company_keys) and jsonb_typeof(v)='array' then
      select
        coalesce(jsonb_agg(s.ni) filter (where s.nc = bga), '[]'::jsonb),
        coalesce(jsonb_agg(s.ni) filter (where s.nc = deraiz), '[]'::jsonb),
        coalesce(jsonb_agg(s.ni) filter (where s.nc not in (bga, deraiz)), '[]'::jsonb)
      into a_bga, a_deraiz, a_general
      from (
        select jsonb_set(it,'{company}',to_jsonb(nrm.nc),true) as ni, nrm.nc
        from jsonb_array_elements(v) it,
        lateral (select case
                   when (it->>'company') = bga then bga
                   when (it->>'company') ilike 'BGA%' then bga
                   when (it->>'company') = deraiz then deraiz
                   when (it->>'company') ilike 'De ra%' then deraiz
                   when (it->>'company') = 'General' then 'General'
                   else 'General' end as nc) nrm
      ) s;
      if jsonb_array_length(a_bga) > 0 then data_bga := data_bga || jsonb_build_object(k, a_bga); end if;
      if jsonb_array_length(a_deraiz) > 0 then data_deraiz := data_deraiz || jsonb_build_object(k, a_deraiz); end if;
      data_general := data_general || jsonb_build_object(k, a_general);
    else
      data_general := data_general || jsonb_build_object(k, v);   -- config/compartido/marcadores -> General
    end if;
  end loop;

  delete from public.app_state_modules_v2 where module_key = p_module_key;
  insert into public.app_state_modules_v2(module_key,company,payload,saved_at,updated_at,updated_by)
  values (p_module_key,'General', envelope||jsonb_build_object('data',data_general), rec.saved_at, rec.updated_at, rec.updated_by);
  n := 1;
  if data_bga <> '{}'::jsonb then
    insert into public.app_state_modules_v2(module_key,company,payload,saved_at,updated_at,updated_by)
    values (p_module_key,bga, envelope||jsonb_build_object('data',data_bga), rec.saved_at, rec.updated_at, rec.updated_by);
    n := n + 1;
  end if;
  if data_deraiz <> '{}'::jsonb then
    insert into public.app_state_modules_v2(module_key,company,payload,saved_at,updated_at,updated_by)
    values (p_module_key,deraiz, envelope||jsonb_build_object('data',data_deraiz), rec.saved_at, rec.updated_at, rec.updated_by);
    n := n + 1;
  end if;
  return n;
end $$;

revoke execute on function public.app_split_module_into_v2(text) from anon, authenticated;

-- Poblar (se corrió módulo por módulo por el timeout corto del conector):
--   select public.app_split_module_into_v2(module_key) from public.app_state_modules;


-- ---- Fase 3: RLS por empresa sobre v2 (usa funciones de Fase 1) --------------
alter table public.app_state_modules_v2 enable row level security;

drop policy if exists v2_select on public.app_state_modules_v2;
drop policy if exists v2_insert on public.app_state_modules_v2;
drop policy if exists v2_update on public.app_state_modules_v2;
drop policy if exists v2_delete on public.app_state_modules_v2;

create policy v2_select on public.app_state_modules_v2
  for select to authenticated
  using (public.app_can_access_company(company) or public.app_is_superadmin());

create policy v2_insert on public.app_state_modules_v2
  for insert to authenticated
  with check ((public.app_can_access_company(company) or public.app_is_superadmin())
              and updated_by = auth.uid());

create policy v2_update on public.app_state_modules_v2
  for update to authenticated
  using (public.app_can_access_company(company) or public.app_is_superadmin())
  with check ((public.app_can_access_company(company) or public.app_is_superadmin())
              and updated_by = auth.uid());

create policy v2_delete on public.app_state_modules_v2
  for delete to authenticated
  using (public.app_can_access_company(company) or public.app_is_superadmin());

-- ============================================================================
-- Fase 4 (PENDIENTE — frontend, NO en SQL): que App.tsx lea/escriba v2 por
--   (módulo, empresa), mergee General + empresas permitidas en memoria, y en
--   guardado escriba una fila por empresa con updated_by = auth.uid() (si no, las
--   políticas with check lo rechazan). Probar con usuario restringido + superadmin.
-- Cutover: cuando el frontend nuevo esté validado, retirar app_state_modules vieja.
-- ============================================================================
