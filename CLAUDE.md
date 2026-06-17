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

## Trabajo pendiente (ver docs/formulas-y-vinculos.md para el detalle de fórmulas)

1. Aislamiento por empresa (rediseño de persistencia + funciones de ayuda + RLS por empresa + frontend). Base de F4.
   Fases 1-3 ya APLICADAS (ver `supabase/fase2-3-aislamiento-por-empresa.sql`): funciones de ayuda,
   tabla `app_state_modules_v2` poblada por empresa (coexiste con la vieja), y RLS por empresa sobre v2.
   FALTA la Fase 4 (frontend): que `App.tsx` lea/escriba v2 por (módulo, empresa), mergee General +
   empresas permitidas, y escriba `updated_by = auth.uid()`. Probar con usuario restringido + superadmin
   antes de desplegar; luego cutover (retirar `app_state_modules` vieja).
2. F2 facturación: % anticipo como campo numérico, % facturación editable, cuotas intermedias sin pisarse.
3. F4 contabilidad blanco/negro: dos resultados separados; origen del dinero en compras; desfasaje blanco↔negro.
4. F5 stock: ligar material↔stock por código; a futuro stock con movimientos + import de remito (OCR).
5. F6 CRM: tabla de clientes como fuente de verdad (alta standalone, ID estable, typeahead, autocompletado).
6. F7 personal: renombrar provisiones (EPP/Insumos/Exámenes/Capacitaciones), premios con origen blanco/negro,
   valor hora sobre horas productivas (descontar feriados/vacaciones) + recordatorios.
7. Estética/layout: que los bloques llenen la pantalla sin huecos y se redimensionen para ser legibles.
8. Modularización continua de `App.tsx` (~20k líneas) extracción por extracción, verificando con tsc.
9. IDs por UUID (hoy `Date.now()` puede colisionar entre usuarios) y merge por ítem en la sync realtime.

## Cuándo conviene Claude Code

Para la fase pesada (rediseño de persistencia, migraciones, modularización grande, correr/testear la app
en cada paso) Claude Code en la terminal es más efectivo: corre local sin los límites del sandbox.
Para planificación, trabajo de base de datos vía conector y cambios chicos, Cowork es cómodo. Ambos
comparten esta carpeta, este git y los conectores, así que el trabajo de uno lo ve el otro.
