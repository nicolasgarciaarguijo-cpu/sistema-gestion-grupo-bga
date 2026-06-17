-- ============================================================================
-- Fase 2 — Migración de datos por empresa  (BORRADOR — NO APLICADO)
-- ============================================================================
-- Objetivo: partir el estado global (una fila JSON por módulo en app_state_modules)
-- en filas (module_key, company), conservando SOLO los ítems de cada empresa.
--
-- Decisiones acordadas (2026-06-17):
--   * Destino: TABLA NUEVA app_state_modules_v2 que COEXISTE con la tabla viva.
--     El frontend actual sigue leyendo app_state_modules; se corta al viejo recién
--     cuando el frontend nuevo (Fase 4) lea de v2. Reversible: basta con DROP v2.
--   * Marcadores (fixed/labor/supply/personalProvision): COMPARTIDOS → van a 'General'
--     enteros (plan F3). Por eso sus claves NO están en per_company_keys.
--   * Mojibake: 'BGA ...diseÃ±o...' (y cualquier valor que empiece con BGA/De ra) se
--     NORMALIZA al nombre canónico de companies.name antes de separar. Sin esto, 3 ítems
--     quedarían huérfanos. Valores desconocidos → 'General' (no se pierden).
--
-- Pre-requisito de seguridad ya hecho: backup en esquema `backups`
--   (backups.app_state_modules_20260617, backups.app_state_snapshots_20260617).
--
-- Cómo usar: revisar -> correr secciones A, B -> correr validación (C) y confirmar
--   que "items_origen" == "items_destino" -> recién entonces planificar Fase 3 (RLS)
--   y Fase 4 (frontend). NADA de esto despliega solo.
-- Rollback: drop table app_state_modules_v2;   (la tabla viva queda intacta)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- A) Tabla destino (coexiste con la viva). PK (module_key, company).
-- ----------------------------------------------------------------------------
create table if not exists public.app_state_modules_v2 (
  module_key text not null,
  company    text not null,            -- companies.name, o 'General' (compartido)
  payload    jsonb not null,           -- mismo "sobre" { moduleKey, moduleLabel, version, savedAt, data:{...} }
  saved_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key (module_key, company)
);

-- RLS se ACTIVA y se escriben políticas en la Fase 3 (no acá). Mientras tanto la tabla
-- queda con RLS desactivado pero el frontend NO la usa todavía; igual conviene activarla:
alter table public.app_state_modules_v2 enable row level security;
-- (sin políticas todavía => nadie via anon/authenticated; service_role sí. Fase 3 agrega
--  políticas con app_can_access_company(company).)


-- ----------------------------------------------------------------------------
-- B) Migración: parte cada módulo por empresa, normalizando company.
-- ----------------------------------------------------------------------------
do $$
declare
  bga    text := 'BGA estudio de diseño y produccion industrial s.r.l';
  deraiz text := 'De raiz s.r.l';
  -- Claves cuyos ítems se separan por su campo `company`. (Marcadores NO están: van a General.)
  per_company_keys text[] := array[
    'archivos|companyAssets',
    'caja-chica|pettyCashExpenses', 'caja-chica|pettyCashFunds',
    'cash-flow|debtPlans', 'cash-flow|financialItems',
    'compras|purchaseInvoices',
    'historial-crm|savedBudgets',
    'personal|employees',
    'stock-costos|costAnalysisGroups', 'stock-costos|stockItems',
    'trabajos-aprobados|approvedJobs'
  ];
  m            record;
  payload_fix  jsonb;
  data_obj     jsonb;
  envelope     jsonb;
  k            text;
  v            jsonb;
  item         jsonb;
  nc           text;            -- company normalizada del ítem
  norm_item    jsonb;
  data_general jsonb;
  data_bga     jsonb;
  data_deraiz  jsonb;
  arr_general  jsonb;
  arr_bga      jsonb;
  arr_deraiz   jsonb;
begin
  -- empezar limpio para que el script sea re-ejecutable
  truncate public.app_state_modules_v2;

  for m in select * from public.app_state_modules loop
    -- Normalización de mojibake a nivel texto: corrige el nombre de BGA en TODO el payload
    -- (arrays por-empresa, marcadores compartidos y snapshots anidados de presupuestos).
    payload_fix := replace(m.payload::text, 'diseÃ±o', 'diseño')::jsonb;
    data_obj := coalesce(payload_fix -> 'data', '{}'::jsonb);
    envelope := payload_fix - 'data';        -- moduleKey, moduleLabel, version, savedAt
    data_general := '{}'::jsonb;
    data_bga     := '{}'::jsonb;
    data_deraiz  := '{}'::jsonb;

    for k, v in select * from jsonb_each(data_obj) loop
      if (m.module_key || '|' || k) = any(per_company_keys)
         and jsonb_typeof(v) = 'array' then
        -- Array por-empresa: repartir ítem por ítem (normalizando su company).
        arr_general := '[]'::jsonb;
        arr_bga     := '[]'::jsonb;
        arr_deraiz  := '[]'::jsonb;
        for item in select * from jsonb_array_elements(v) loop
          nc := case
                  when (item->>'company') = bga    then bga
                  when (item->>'company') ilike 'BGA%' then bga      -- atrapa el mojibake
                  when (item->>'company') = deraiz then deraiz
                  when (item->>'company') ilike 'De ra%' then deraiz
                  when (item->>'company') = 'General' then 'General'
                  else 'General'                                     -- desconocidos: no perder
                end;
          norm_item := jsonb_set(item, '{company}', to_jsonb(nc), true);
          if nc = bga then
            arr_bga := arr_bga || norm_item;
          elsif nc = deraiz then
            arr_deraiz := arr_deraiz || norm_item;
          else
            arr_general := arr_general || norm_item;
          end if;
        end loop;
        if jsonb_array_length(arr_bga)    > 0 then data_bga    := data_bga    || jsonb_build_object(k, arr_bga);    end if;
        if jsonb_array_length(arr_deraiz) > 0 then data_deraiz := data_deraiz || jsonb_build_object(k, arr_deraiz); end if;
        -- la clave siempre existe en General (aunque vacía) para preservar la forma
        data_general := data_general || jsonb_build_object(k, arr_general);
      else
        -- Clave compartida/config/escalar (incl. marcadores y presupuestos) → General entera.
        data_general := data_general || jsonb_build_object(k, v);
      end if;
    end loop;

    -- Escribir filas: General siempre; BGA/De raíz solo si tienen datos propios.
    insert into public.app_state_modules_v2 (module_key, company, payload, saved_at, updated_at, updated_by)
    values (m.module_key, 'General', envelope || jsonb_build_object('data', data_general),
            m.saved_at, m.updated_at, m.updated_by);

    if data_bga <> '{}'::jsonb then
      insert into public.app_state_modules_v2 (module_key, company, payload, saved_at, updated_at, updated_by)
      values (m.module_key, bga, envelope || jsonb_build_object('data', data_bga),
              m.saved_at, m.updated_at, m.updated_by);
    end if;

    if data_deraiz <> '{}'::jsonb then
      insert into public.app_state_modules_v2 (module_key, company, payload, saved_at, updated_at, updated_by)
      values (m.module_key, deraiz, envelope || jsonb_build_object('data', data_deraiz),
              m.saved_at, m.updated_at, m.updated_by);
    end if;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- C) Validación: que NO se haya perdido ni un ítem.
--    Compara la cantidad de ítems en los arrays por-empresa de origen vs destino.
--    Deben dar IGUAL (items_origen = items_destino). Correr y revisar a ojo.
-- ----------------------------------------------------------------------------
-- with pc(module_key, data_key) as (
--   values ('archivos','companyAssets'),
--          ('caja-chica','pettyCashExpenses'),('caja-chica','pettyCashFunds'),
--          ('cash-flow','debtPlans'),('cash-flow','financialItems'),
--          ('compras','purchaseInvoices'),('historial-crm','savedBudgets'),
--          ('personal','employees'),('stock-costos','costAnalysisGroups'),
--          ('stock-costos','stockItems'),('trabajos-aprobados','approvedJobs')
-- ),
-- origen as (
--   select count(*) n
--   from pc join public.app_state_modules m using (module_key)
--   cross join lateral jsonb_array_elements(m.payload->'data'->pc.data_key)
-- ),
-- destino as (
--   select count(*) n
--   from pc join public.app_state_modules_v2 v using (module_key)
--   cross join lateral jsonb_array_elements(v.payload->'data'->pc.data_key)
-- )
-- select (select n from origen) as items_origen,
--        (select n from destino) as items_destino,
--        (select n from origen) = (select n from destino) as ok;

-- Distribución resultante por empresa (sanity check):
-- select company, count(*) as filas_modulo
-- from public.app_state_modules_v2 group by company order by company;

-- ============================================================================
-- Fase 3 (NO en este script) — al confirmar la validación:
--   * Políticas RLS en app_state_modules_v2:
--       using (public.app_can_access_company(company) or public.app_is_superadmin())
--       with check ((public.app_can_access_company(company) or public.app_is_superadmin())
--                   and updated_by = auth.uid())
--   * Replicar para crm_budgets/crm_clients (tienen columna company).
-- Fase 4 — frontend lee/escribe v2 por (módulo, empresa) y mergea General + permitidas.
-- Cutover — cuando v2 + frontend nuevo estén validados, congelar y retirar la tabla vieja.
-- ============================================================================
