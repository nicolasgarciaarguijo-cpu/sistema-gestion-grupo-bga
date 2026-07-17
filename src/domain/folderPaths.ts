// Rutas de las carpetas del backup en OneDrive. UNA sola fuente de verdad para todas las solapas.
//
// Regla acordada con el usuario:
//   <EMPRESA> / Ejercicio <A>-<B> (nov-oct) / <AAAA-MM Mes> / ...
// - EMPRESA siempre primero: BGA, DE RAIZ o GENERAL (la conjunta; GENERAL es SOLO para reportes).
// - Despues el AÑO FISCAL (nov-oct por default, configurable por empresa).
// - El MES solo donde tiene sentido. Ej: en Personal, la documentacion cruda del empleado (ficha de
//   alta, DNI, contrato) NO vence: va sin ejercicio ni mes. Lo que tiene periodicidad (recibos,
//   presentismo, EPP, examenes...) si va por ejercicio y mes.
//
// El sistema solo conserva el ejercicio en curso; las carpetas son el archivo historico permanente.

import { getFiscalYearStartMonth } from "./fiscalYear";

const MES_NOMBRE = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Nombre de carpeta de empresa. "General" es la conjunta (solo reportes).
export function companyFolderName(shortOrScope: string): string {
  const s = (shortOrScope || "").trim();
  if (!s) return "GENERAL";
  if (/^general$/i.test(s)) return "GENERAL";
  return s.toUpperCase(); // "BGA" -> "BGA" ; "De raiz" -> "DE RAIZ"
}

// Año de INICIO del ejercicio fiscal que contiene a (anio, mes). Ej: nov-oct, 2024-01 -> 2023.
export function fiscalStartYearOf(startMonth: number, anio: number, mes: number): number {
  return mes >= startMonth ? anio : anio - 1;
}

// Carpeta del ejercicio: "Ejercicio 2023-2024 (nov-oct)".
export function fiscalYearFolderName(startMonth: number, anio: number, mes: number): string {
  const sm = Math.min(12, Math.max(1, Math.round(startMonth)));
  const a = fiscalStartYearOf(sm, anio, mes);
  const endMonth = sm === 1 ? 12 : sm - 1;
  return `Ejercicio ${a}-${a + 1} (${MES_CORTO[sm - 1]}-${MES_CORTO[endMonth - 1]})`;
}

// Carpeta de mes: "2024-01 Enero". Ordena cronologicamente dentro del ejercicio.
export function monthFolderName(anio: number, mes: number): string {
  const m = Math.min(12, Math.max(1, Math.round(mes)));
  return `${anio}-${String(m).padStart(2, "0")} ${MES_NOMBRE[m - 1]}`;
}

// Desde una fecha ISO (yyyy-mm-dd o yyyy-mm).
export function fiscalYearFolderFromIso(startMonth: number, iso: string): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return fiscalYearFolderName(startMonth, y, m);
}
export function monthFolderFromIso(iso: string): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return monthFolderName(y, m);
}

// --- Personal ---

// Subcarpetas de un empleado. `periodic` = se separa por ejercicio y mes.
// La documentacion cruda (ficha de alta, DNI, contrato) NO vence -> sin ejercicio ni mes.
export type PersonalSection = { name: string; periodic: boolean };
export const PERSONAL_SECTIONS: PersonalSection[] = [
  { name: "Documentacion", periodic: false },
  { name: "EPP", periodic: true },
  { name: "Insumos", periodic: true },
  { name: "Examenes", periodic: true },
  { name: "Capacitaciones", periodic: true },
  { name: "Presentismo", periodic: true },
  { name: "Recibos", periodic: true },
  { name: "Seguridad", periodic: true },
];

export const isPeriodicSection = (name: string): boolean =>
  PERSONAL_SECTIONS.find((s) => s.name.toLowerCase() === (name || "").toLowerCase())?.periodic ?? true;

// Ruta de una seccion del legajo:
//   Personal/<EMPRESA>/<empleado>/<seccion>[/Ejercicio .../<AAAA-MM Mes>]
export function personalSectionPath(input: {
  companyShort: string;
  employeeFolder: string;
  section: string;
  iso?: string; // fecha del documento; requerida si la seccion es periodica
  fiscalStartMonth?: number;
}): string {
  const empresa = companyFolderName(input.companyShort);
  const base = `Personal/${empresa}/${input.employeeFolder}/${input.section}`;
  if (!isPeriodicSection(input.section) || !input.iso) return base;
  const sm = getFiscalYearStartMonth({ fiscalYearStartMonth: input.fiscalStartMonth });
  return `${base}/${fiscalYearFolderFromIso(sm, input.iso)}/${monthFolderFromIso(input.iso)}`;
}
