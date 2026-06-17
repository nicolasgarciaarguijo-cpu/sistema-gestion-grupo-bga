# Plan detallado — Aislamiento de datos por empresa

Objetivo: que cada usuario solo pueda leer y modificar los datos de las empresas que
tiene habilitadas (BGA y/o De Raíz), con los datos compartidos ("General") visibles
para todos. Hoy esto NO se cumple: cualquier usuario logueado ve y edita todo.

Este documento es la guía de implementación. Es la columna vertebral del sistema, así
que va por etapas, cada una verificable y reversible.

---

## 1. Por qué no alcanza con cambiar RLS

RLS aísla **filas**. Hoy casi todos los datos viven en:

- `app_state_snapshots`: una sola fila (`id = "main"`) con un JSON de TODA la app.
- `app_state_modules`: una fila por módulo (`module_key`), cada una con un JSON que
  mezcla las dos empresas.

Es decir: una sola fila contiene los datos de todas las empresas. RLS no puede mostrar
"media fila". Por eso, **primero hay que cambiar dónde se guardan los datos** (que cada
empresa tenga sus propias filas) y recién ahí RLS puede aislar.

`crm_budgets` y `crm_clients` existen como tablas pero están VACÍAS: hoy no se usan; los
datos reales están en el JSON global.

---

## 2. Estrategia elegida: particionar el estado por empresa

En vez de una fila por módulo, pasamos a **una fila por (módulo + empresa)**. Cada fila
guarda solo los ítems de esa empresa. Los datos compartidos van a una empresa especial
`General`, visible para todos.

Ventaja: es el cambio más chico que habilita aislamiento real, sin reescribir todo el
modelo relacional. (La normalización completa a tablas por entidad queda como dirección
futura para presupuestos/clientes, donde además ayuda al CRM — ver F6.)

### Cambio de esquema

`app_state_modules` pasa de PK `module_key` a PK `(module_key, company)`:

```
module_key text     -- ej: "presupuestos", "trabajos-aprobados", ...
company    text     -- "BGA estudio...", "De raiz s.r.l", o "General"
payload    jsonb    -- SOLO los ítems de esa empresa para ese módulo
saved_at, updated_at, updated_by
```

Módulos que son globales (catálogo de empresas, configuración general, y los marcadores
mientras sean compartidos — ver F3) se guardan con `company = 'General'`.

---

## 3. Fases

### Fase 0 — Prerrequisitos (rápido, ya casi listo)
- [x] Superadmin designado (`ngarciaarguijo@grupobga.com.ar`).
- [x] Tablas `companies` (2) y `user_company_permissions` (9) pobladas.
- [ ] Confirmar el mapeo nombre de empresa ↔ `companies.name` (el frontend usa el nombre
  largo como `company`; las políticas deben comparar contra ese mismo valor).

### Fase 1 — Funciones de ayuda (SQL, no existen hoy)
Crear en Postgres, `security definer`, `search_path = ''`:
- `app_is_active_user()` — el perfil existe y está activo.
- `app_is_superadmin()` — perfil activo y `is_superadmin`.
- `app_can_access_company(company_name text)` — superadmin, o tiene permiso para esa
  empresa, o la empresa es `General`.
- `app_can_access_tab(tab_key text)` — superadmin, o tiene la solapa habilitada.

(Existen como borrador en `supabase/rls-policies.sql`; hay que adaptarlas al esquema real
y agregar el caso `General`.)

### Fase 2 — Migración de datos (reversible)
1. Backup del estado actual (export de `app_state_snapshots` y `app_state_modules`).
2. Script que lee cada `payload` de módulo y **separa los ítems por su campo `company`**,
   escribiendo una fila nueva por (módulo, empresa). Lo que no tiene empresa o es
   compartido → `General`.
3. Dejar el `app_state_snapshots` "main" como respaldo de solo lectura hasta validar.

### Fase 3 — RLS por empresa
Sobre `app_state_modules` (y las tablas que se usen, como `crm_budgets` que tiene columna
`company`):
- SELECT / INSERT / UPDATE / DELETE: `app_can_access_company(company)` o `app_is_superadmin()`.
- INSERT/UPDATE exigen `updated_by = auth.uid()`.
- Reemplazar las políticas "siempre verdaderas" actuales (las que marcó el linter).

### Fase 4 — Frontend (`src/App.tsx`) — IMPLEMENTADA (rama `fase4-frontend-v2`, pend. verificación)
Lógica pura en `src/domain/companyState.ts` (split/merge/slice por empresa) + tests.
`PER_COMPANY_MODULE_FIELDS` debe coincidir con `per_company_keys` del splitter SQL.
- **Carga:** `readSupabasePersistedModuleRecords` lee `app_state_modules_v2` con `company`;
  el merge agrupa por módulo y usa `mergeModuleDataByCompany` (concatena arrays por-empresa,
  globales de General). RLS ya limita las filas a las empresas del usuario. ✓
- **Guardado:** `splitModuleDataByCompany` separa por `item.company` y se hace
  `upsert(onConflict: "module_key,company")` con `updated_by = auth.uid()`. Si todavía no se
  cargaron las empresas escribibles, aborta el write a Supabase (el guardado local ya ocurrió). ✓
- **Realtime:** `applyCompanyModuleSlice` reemplaza solo la porción de la empresa entrante. ✓
- **Selector de empresa:** el frontend ya filtra por `canAccessCompany(item.company)`. ✓
- **Verificación automática hecha:** `tsc` 0 errores, 27 tests, build de producción OK,
  splitter re-corrido (v2 = 26 filas).
- **PENDIENTE (manual, requiere usuario):** `npm run auth-smoke` con credenciales reales en
  `.env.auth.local`, y prueba con usuario restringido + superadmin (ver Fase 5).
- **PENDIENTE (decoupled):** migración de IDs a UUID (#9) — es migración de tipos+datos aparte.

### Fase 5 — Pruebas (antes de confiar)
- Crear/usar un usuario restringido (una sola empresa) y un superadmin.
- `npm run auth-smoke` con `.env.auth.local` (verifica permisos esperados y denegados).
- Manual: loguear restringido → solo ve su empresa y sus solapas; loguear superadmin →
  ve todo. Probar guardar con cada uno y confirmar que no se pisan datos de otras empresas.

### Fase 6 — Salida a producción
- Aplicar en una ventana tranquila; tener el backup a mano.
- Desplegar el frontend nuevo en Vercel junto con el cambio de esquema (deben ir juntos:
  el frontend nuevo espera filas por empresa).

---

## 4. Datos compartidos ("General" = gris)

- El catálogo de empresas y la configuración general → `company = 'General'`.
- Marcadores: por defecto compartidos (`General`); cuando se implemente la opción de
  marcadores por empresa (F3), pasan a guardarse por empresa.
- `app_can_access_company('General')` siempre devuelve verdadero para usuarios activos.

---

## 5. Riesgos y mitigaciones

- **Lockout (dejar a todos sin acceso):** por eso las funciones de ayuda y el superadmin
  van primero, y se prueba con usuario restringido antes de confiar. Todo reversible con
  el backup del snapshot.
- **Romper el guardado:** si el frontend no escribe `updated_by`, las políticas con
  `with check` lo rechazan. Verificar que se setea en cada insert/update.
- **Doble fuente de datos:** mientras coexistan el JSON global y las filas por empresa,
  evitar leer de ambos. Migrar y luego cortar el viejo.
- **IDs `Date.now()`:** al separar por empresa conviene migrar a UUID para evitar
  colisiones entre usuarios (va de la mano, ver pendiente #9 del CLAUDE.md).

---

## 6. Por qué esta fase conviene en Claude Code

Toca esquema (migraciones), RLS y el frontend a la vez, y hay que **correr y testear la
app en cada paso** (auth-smoke, login con dos usuarios, build). Eso se hace mejor en local
con Claude Code; el sandbox de Cowork no siempre termina el build. El trabajo de base de
datos puntual (crear funciones, aplicar políticas) se puede seguir haciendo por el
conector de Supabase desde acá.

---

## 7. Orden sugerido de ejecución

1. Fase 1 (funciones de ayuda) — se puede hacer ya, por el conector, sin afectar nada.
2. Fase 2 (migración con backup) en una copia / ventana tranquila.
3. Fase 3 + 4 juntas (RLS + frontend) en una rama, probadas con Fase 5.
4. Fase 6 (deploy coordinado).
