---
name: bga-design
description: Design system y guía de UX para el Sistema de Gestión Grupo BGA. Usar SIEMPRE que se toque estética, UI, layout, componentes visuales, o el diseño de los documentos exportables/imprimibles (presupuesto cliente, reportes PDF). Incluye tokens reales (colores, tipografía, espaciado), la semántica de color por empresa (regla dura), el enfoque de estilos del código y el flujo recomendado (mockup → implementar → verificar).
---

# Diseño — Sistema de Gestión Grupo BGA

Guía para producir UI y documentos **consistentes, legibles y prolijos** sin romper lo existente.
Flujo recomendado: **mockup primero** (con la herramienta de visualización del chat) → acordar →
**implementar** en código → **verificar** (`/verify` o preview de Vercel).

## Regla dura: color = semántica de empresa (NO romper)
- **AZUL = BGA** · **MARRÓN = De Raíz** · **GRIS = General (ambas/compartido)**.
- Nunca cambiar el color de una empresa por estética. Solo se permite mejorar contraste de
  textos neutros. Si una vista es de una empresa, su acento sale de `workspaceTheme`/`getCompanyMeta`.

## Cómo se estilan las cosas en este repo (importante)
- **NO hay Tailwind ni CSS modules.** El estilado es:
  1. Un objeto central `const styles: Record<string, React.CSSProperties>` al final de `src/App.tsx`
     (~línea 18425). Reusar/extender esas keys; no inventar estilos sueltos repetidos.
  2. `workspaceTheme` (`useMemo`, ~línea 5004): deriva gradientes/acentos de la empresa activa vía
     `getCompanyMeta()` + `hexToRgba()`. Para acentos de empresa, leer de ahí.
- Al agregar estilo nuevo, seguir la convención inline + token; mantener la densidad de comentarios
  del entorno. Verificar con `npx tsc --noEmit` (0 errores) tras cada cambio en `App.tsx`.

## Tokens reales (extraídos del código)
**Colores de empresa** (`DEFAULT_COMPANY_OPTIONS`, `getCompanyMeta`):
- BGA: primary `#14213d`, soft `#dbe7f7`
- De Raíz: primary `#b7791f`, soft `#fef3c7`
- General: primary `#475569`, soft `#e2e8f0`

**Escala neutra (slate)** usada en todo el sistema:
`#0f172a` (texto) · `#1e293b` · `#334155` · `#475569` (muted/secundario) · `#cbd5e1` (bordes) ·
`#e2e8f0` · `#f1f5f9` · `#f8fafc` (fondos). Blanco `#ffffff` para tarjetas.

**Tipografía:** `Arial, sans-serif`. Tamaños en uso: 11–12 (datos/secundario), 15 (subtítulos),
18 (títulos). Pesos: 700 para labels/eyebrows (mayúsculas + `letterSpacing`).

**Forma/elevación:** radios 18 (tarjetas) y 24 (sidebar); sombras suaves
`0 1px 3px rgba(0,0,0,0.08)` (tarjeta) y `0 18px 40px rgba(15,23,42,0.18)` (paneles grandes).
Espaciado base múltiplos de ~2/4 (gaps 8/10/14/18; padding 12/16/18).

## Principios de UX
- **Jerarquía clara**: un H1 por vista, subtítulos consistentes, "eyebrow" en mayúsculas para secciones.
- **Números alineados a la derecha** y tabulares en tablas; totales destacados (peso/again color de empresa).
- **Contraste AA**: texto sobre fondos claros usa `#0f172a`/`#334155`; evitar gris claro sobre gris.
- **Densidad cómoda**: que los bloques llenen el ancho disponible (pendiente histórico: evitar huecos),
  sin amontonar; usar las grillas (`workspaceShell`) en vez de anchos fijos.
- **Estados**: vacío, cargando y error explícitos y discretos (usar `styles.muted`).

## Documentos exportables / imprimibles (presupuesto cliente y reportes)
Dónde vive: `exportPrint(mode)` (~5204), el contenedor `#client-budget-pdf` (~17586, oculto en
pantalla) y el bloque `@media print` (~9509) que controla qué se ve al imprimir (`data-print-mode`).

Objetivos de rediseño:
- **Encabezado**: logo + datos de la empresa (con su color semántico en un filete/ribbon), número de
  presupuesto, fecha, validez. Cliente y proyecto claros.
- **Tablas**: encabezados sobrios, zebra muy suave (`#f8fafc`), números a la derecha, una sola línea de
  total por sección, y el **total final destacado** (recuadro con `soft` de la empresa + texto `primary`).
- **Tipografía de impresión**: cuerpo 10–11pt, títulos 14–18pt; interlineado cómodo; evitar fuentes
  decorativas (mantener Arial salvo que se defina una de marca).
- **A4 prolijo**: márgenes consistentes, `page-break-inside: avoid` en filas/tarjetas, sin cortar tablas
  a la mitad; pie con validez, condiciones y firma.
- **Marca discreta**: el color de empresa como acento, no como fondo dominante; mucho blanco.

## Checklist antes de mergear estética
- [ ] No se alteró la semántica de color de empresa.
- [ ] `npx tsc --noEmit` = 0 errores; tests OK si se tocó lógica.
- [ ] Contraste legible (sin gris claro sobre gris).
- [ ] Reutiliza `styles`/`workspaceTheme` en vez de duplicar estilos.
- [ ] En exportables: entra prolijo en A4, sin cortes feos, total final claro.
- [ ] Verificado visualmente (`/verify` o preview de Vercel) antes de deploy.

## Recursos que potencian esto (instala el usuario)
Plugins oficiales de Anthropic (correr en la terminal de Claude Code):
`/plugin install design@claude-plugins-official` y `frontend-design@claude-plugins-official`, luego
`/reload-plugins`. Dan crítica de diseño, accesibilidad y generación de UI de alto nivel que complementa
esta guía específica del proyecto.
