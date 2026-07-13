// Ano fiscal por empresa. El mes de inicio es configurable (default noviembre). Ambas empresas
// arrancan en noviembre (nov-oct), pero queda por empresa por si se suma una con otro calendario. Las
// funciones son puras y trabajan con fechas ISO (yyyy-mm-dd) comparadas como texto para evitar husos.

export const DEFAULT_FISCAL_START_MONTH = 11; // noviembre

// Mes de inicio (1-12) del ano fiscal de una empresa; default noviembre si no esta configurado o es invalido.
export function getFiscalYearStartMonth(
  company?: { fiscalYearStartMonth?: number } | null
): number {
  const m = company?.fiscalYearStartMonth;
  return typeof m === "number" && m >= 1 && m <= 12 ? Math.round(m) : DEFAULT_FISCAL_START_MONTH;
}

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Limites [startIso, endIso] INCLUSIVOS del ano fiscal que empieza en (startYear, startMonth).
// Ej: startMonth=10, startYear=2025 -> { 2025-10-01, 2026-09-30 }.
export function fiscalYearBounds(
  startMonth: number,
  startYear: number
): { startIso: string; endIso: string } {
  const sm = Math.min(12, Math.max(1, Math.round(startMonth)));
  const start = new Date(startYear, sm - 1, 1);
  const nextStart = new Date(startYear + 1, sm - 1, 1);
  const end = new Date(nextStart.getTime() - 86400000);
  return { startIso: iso(start), endIso: iso(end) };
}

// Ano de INICIO del ano fiscal que contiene a `today`. Ej: octubre, hoy=2026-06 -> 2025 (arranco oct 2025).
export function currentFiscalStartYear(startMonth: number, today: Date): number {
  const sm = Math.min(12, Math.max(1, Math.round(startMonth)));
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return month >= sm ? year : year - 1;
}

// Limites [startIso, endIso] inclusivos de un mes calendario "yyyy-mm".
export function monthBounds(ym: string): { startIso: string; endIso: string } {
  const [y, m] = ym.slice(0, 7).split("-").map(Number);
  const start = new Date(y, (m || 1) - 1, 1);
  const end = new Date(y, m || 1, 0);
  return { startIso: iso(start), endIso: iso(end) };
}

// True si la fecha ISO cae dentro del rango inclusivo. Fechas vacias/invalidas = false.
export function isIsoInRange(dateStr: string, startIso: string, endIso: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d >= startIso && d <= endIso;
}

// Etiqueta legible de un ano fiscal: "oct 2025 - sep 2026".
export function fiscalYearLabel(startMonth: number, startYear: number): string {
  const { startIso, endIso } = fiscalYearBounds(startMonth, startYear);
  const short = (isoStr: string) => {
    const [y, m] = isoStr.slice(0, 7).split("-").map(Number);
    const name = new Date(y, (m || 1) - 1, 1)
      .toLocaleDateString("es-AR", { month: "short" })
      .replace(".", "");
    return `${name} ${y}`;
  };
  return `${short(startIso)} - ${short(endIso)}`;
}
