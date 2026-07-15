# Sistema de Gestión Grupo BGA — contexto del proyecto

Este archivo es el "puente" de contexto compartido entre Cowork (app de escritorio)
y Claude Code (terminal). Ambos trabajan sobre esta misma carpeta y el mismo git, con
la misma cuenta y conectores (Supabase, Vercel). Leer esto primero.

## Qué es

ERP web multiempresa y multiusuario en tiempo real para Grupo BGA.

- Frontend: React 18 + TypeScript (Create React App). Monolito en `src/App.tsx`.
- Backend: Supabase (Auth + Postgres 17 + RLS + realtime). Proyecto ref `ilmcvnnawzorvzpwpoes` (nombre "SISTEMA").
- Deploy: Vercel (`sistema-gestion-grupo-bga-...vercel.app`).
- Empresas: BGA y De Raíz. 12 solapas: acceso, cashflow, facturacion, aprobados,
  fabricacion, compras, cajaChica, presupuesto, historial (CRM), stock, personal, marcadores.

## Convenciones (importante, respetar)

- **Saltos de línea:** el repo usa LF. Hay `.gitattributes` que lo fuerza. No reintroducir CRLF.
- **Color = semántica de empresa:** AZUL = BGA, MARRÓN = De Raíz, GRIS = ambas (General).
  No alterar esos colores al tocar estética; solo mejorar contraste de textos neutros.
- **Verificación:** después de cada cambio en `App.tsx`, correr `npx tsc --noEmit` (debe dar 0 errores).
  El build completo de webpack es lento; en sandbox no siempre termina. `tsc` es la verificación rápida.
  Si tocás lógica con tests (`src/lib/format.ts`, `src/domain/scale.ts`), correr también los tests.
- **Commits:** incrementales, uno por cambio lógico, mensajes claros. Rama actual: `main`.
  Remoto `origin` configurado → `github.com/nicolasgarciaarguijo-cpu/sistema-gestion-grupo-bga`
  (conectado a Vercel; lo que llega a `main` se despliega). El push usa Git Credential Manager;
  `gh` no está instalado (los PR se crean por la web).

## Comandos

- `npm run preflight` — valida env vars y tablas Supabase.
- `npm run auth-smoke` — prueba usuarios (necesita `.env.auth.local`).
- `npm run release-check` — preflight + auth-smoke + build.
- `npx tsc --noEmit` — chequeo de tipos (verificación rápida tras editar).
- `CI=true npx react-scripts test --watchAll=false` — tests unitarios (Jest).
- CI en GitHub Actions (`.github/workflows/ci.yml`): tsc + tests + build en cada PR/push a `main`.

## Estado actual del código (hecho)

- `.gitattributes` agregado (fin de diffs fantasma por CRLF).
- Tipos de dominio extraídos a `src/domain/types.ts` (66 tipos + WORK_TYPE_OPTIONS).
- Helpers de formato extraídos a `src/lib/format.ts`.
- F1 IVA: trabajos aprobados/directos usan su propia alícuota (no 21% fijo).
- F7 escala: `getScaleForCategory` cae al último mes cargado si falta el mes en curso.
  Lógica extraída a `src/domain/scale.ts` (pura, testeada).
- F3 marcadores: quitado el efecto que borraba filas manuales al cambiar empresa/tipo de trabajo.
- Estética: grises `muted`/`calendarEmpty` oscurecidos; paneles "wide" ahora a ancho completo.
- Repo unificado con producción: las dos historias disjuntas (local 19 + GitHub 41 commits)
  se unieron con `git merge -s ours --allow-unrelated-histories` (sin force-push). Pendiente de
  mergear el PR de la rama `codex/merge-mejoras`.
- Tests (Jest) + CI (GitHub Actions) agregados; `@types/jest` en devDependencies.

## Estado Supabase / seguridad

- RLS activado en todas las tablas. **Fase 1 aplicada** (migración `fase1_helper_functions_access_control`):
  existen `app_is_active_user()`, `app_is_superadmin()`, `app_can_access_company(p_company_name)` y
  `app_can_access_tab(p_tab_key)`, todas `security definer`/`search_path=''`. **Todavía NO las usa
  ninguna política RLS** (no cambian comportamiento aún). `app_can_access_company` compara contra
  `companies.name` y devuelve true para `'General'`.
- Aplicado: chat interno con lectura solo para participantes; `search_path` fijo en función de trigger.
- Nicolás (`ngarciaarguijo@grupobga.com.ar`) = superadmin.
- Escaneo de la historia de producción: sin secretos filtrados (la `service_role` nunca se commiteó;
  solo la `anon` key, pública por diseño; la versión viva lee de `process.env`).
- Pendiente: políticas UPDATE "siempre verdaderas" en crm_budgets/crm_clients/app_state_* (sin
  aislamiento por empresa) — NO apretarlas hasta tener la Fase 2 (migración de datos) + frontend en
  lockstep, porque el estado vive en una sola fila JSON global y se rompería el guardado;
  protección de contraseñas filtradas desactivada en Auth (activar 1 clic en Dashboard → Authentication).
- Dato clave: `crm_budgets` y `crm_clients` están VACÍAS; todos los datos viven en el JSON global
  `app_state_snapshots`/`app_state_modules`. Por eso el aislamiento real por empresa requiere
  rediseñar la persistencia (sacar datos del JSON global a filas por empresa), no solo cambiar RLS.

## Costos fijos y variables (solapa `costos`, administración BRUTA) — v1 2026-07-15

Nueva solapa que tapa el agujero de los gastos. Estructura por **año fiscal** (nov-oct), mes a mes.

- **Regla base: el GRUPO define fijo/variable**, no el ítem (`CostGroup.kind`).
- **Grupos "auto"** (`CostGroup.auto`): `Compras y materiales` y `Caja chica` (variables) y `Personal`
  (fijo) se **agregan solos** desde sus solapas y NO admiten carga manual — así el mismo gasto no se
  cuenta dos veces. Los otros 5 (`Administrativos, Comerciales, Financieros, Edilicios, Operativos`)
  son los mismos "grandes grupos" de Marcadores y se cargan a mano o por extracto.
- Dominio puro en `src/domain/costs.ts` (+ tests): `buildCostRows` normaliza todas las fuentes,
  `aggregateCosts` arma la grilla grupo × mes, `suggestedFixedMonthlyByGroup` promedia **solo sobre
  los meses con datos** (para sugerir el monto mensual de Marcadores).
- Import de extractos en `src/lib/bankStatement.ts` (+ tests): Excel/CSV/PDF → borrador revisable →
  confirmar (mismo patrón que remitos). Excel vía **SheetJS por CDN con `ensureScript`** (igual que
  Tesseract): sin dependencias nuevas en package.json. Los créditos vienen destildados (no son costos).
- Persistencia: módulo `costos` (`costGroups`, `costEntries`), aislado por empresa en
  `PER_COMPANY_MODULE_FIELDS`. **No requiere migración SQL**: el módulo es nuevo, no hay datos legacy
  que partir y la RLS de `app_state_modules_v2` ya es genérica por empresa.

PENDIENTE (acordado con el usuario, "lo vamos a seguir acomodando"): ajustar el parser al formato real
del banco cuando pase el archivo; enganchar los costos al estado de resultados (hoy `periodStatement`
en `App.tsx` NO usa esta sección: sumaría doble con compras/caja chica/personal — hay que reemplazar
esas fuentes por la agregación de Costos, no agregarlas); y volcar el promedio sugerido a Marcadores.

## Trabajo pendiente (ver docs/formulas-y-vinculos.md para el detalle de fórmulas)

1. Aislamiento por empresa (rediseño de persistencia + funciones de ayuda + RLS por empresa + frontend). Base de F4.
   Fases 1-3 ya APLICADAS (ver `supabase/fase2-3-aislamiento-por-empresa.sql`): funciones de ayuda,
   tabla `app_state_modules_v2` poblada por empresa (coexiste con la vieja), y RLS por empresa sobre v2.
   Fase 4 (frontend) DESPLEGADA A PRODUCCIÓN (2026-06-18): `App.tsx` lee/escribe v2 por (módulo,
   empresa) vía `src/domain/companyState.ts`, con `updated_by = auth.uid()`, poda reactiva en memoria
   para usuarios restringidos. Verificado en prod: aislamiento OK (un usuario de una empresa no ve la
   otra). El cutover llevó a `main` el sistema modernizado entero (producción corría `090415f` "Add
   files via upload", nunca había recibido el trabajo). RLS apretada (migración
   `cutover_tighten_legacy_and_crm_rls`): las 4 "always true" reemplazadas; `crm_budgets` aislada por
   empresa (lista para F6), `crm_clients` por dueño. **Advisors 15 → 5** (4 esperados + leaked-password).
   `app_state_modules` vieja queda de backup (el frontend ya no la escribe). PENDIENTE: UUIDs (#9,
   DECOUPLED: migración tipos+datos), merge realtime por ítem, y el clic de leaked-password en Auth.
2. F2 facturación: % anticipo como campo numérico, % facturación editable, cuotas intermedias sin pisarse.
3. F4 contabilidad blanco/negro: dos resultados separados; origen del dinero en compras; desfasaje blanco↔negro.
4. F5 stock: ligar material↔stock por código; a futuro stock con movimientos + import de remito (OCR).
5. F6 CRM: tabla de clientes como fuente de verdad (alta standalone, ID estable, typeahead, autocompletado).
6. F7 personal: renombrar provisiones (EPP/Insumos/Exámenes/Capacitaciones), premios con origen blanco/negro,
   valor hora sobre horas productivas (descontar feriados/vacaciones) + recordatorios.
7. Estética/layout: que los bloques llenen la pantalla sin huecos y se redimensionen para ser legibles.
8. Modularización continua de `App.tsx` (~20k líneas) extracción por extracción, verificando con tsc.
9. IDs por UUID (hoy `Date.now()` puede colisionar entre usuarios) y merge por ítem en la sync realtime.
10. **Asistente con Claude: LISTO, falta solo activar la API key** (a propósito, para no entrar en gastos
    todavía). Ya está: Edge Function `claude-chat` desplegada (v2, ACTIVE, `verify_jwt=true`, en
    `supabase/functions/claude-chat/index.ts`), cliente `src/lib/assistant.ts`, y `App.tsx` con
    `buildAssistantContext()` (foto en vivo del sistema) + `sendAssistantQuestion()` async. Si no hay key,
    cae en `buildSystemAssistantReply()` (respuestas locales) → hoy funciona igual y **no gasta nada**.
    Para activar: crear key en console.anthropic.com + saldo en Billing, y cargar el secreto
    `ANTHROPIC_API_KEY` en Supabase (Dashboard → Edge Functions → Secrets). Opcional `ANTHROPIC_MODEL`
    (default `claude-opus-4-8`; `claude-sonnet-5` es más barato). No requiere tocar código.

## Cuándo conviene Claude Code

Para la fase pesada (rediseño de persistencia, migraciones, modularización grande, correr/testear la app
en cada paso) Claude Code en la terminal es más efectivo: corre local sin los límites del sandbox.
Para planificación, trabajo de base de datos vía conector y cambios chicos, Cowork es cómodo. Ambos
comparten esta carpeta, este git y los conectores, así que el trabajo de uno lo ve el otro.
