// Núcleo del recibo de sueldo (blanco legal + negro interno). Puro y testeable.

// Días laborables de un mes (para el recibo NEGRO: total ÷ días laborables × días trabajados).
// Por defecto cuenta Lunes a Sábado (la jornada del taller incluye el sábado); domingos NO.
// `holidays` (yyyy-mm-dd) se descuentan si se pasan.
export function workingDaysInMonth(
  monthKey: string,
  opts: { includeSaturday?: boolean; holidays?: string[] } = {}
): number {
  const includeSaturday = opts.includeSaturday !== false;
  const holidays = new Set(opts.holidays || []);
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
  if (!m) return 0;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dow = new Date(year, month - 1, d).getDay(); // 0=Dom ... 6=Sáb
    if (dow === 0) continue; // domingo nunca
    if (dow === 6 && !includeSaturday) continue; // sábado según jornada
    const iso = `${m[1]}-${m[2]}-${String(d).padStart(2, "0")}`;
    if (holidays.has(iso)) continue;
    count += 1;
  }
  return count;
}

// n-ésimo día hábil (Lunes a Viernes) de un mes. month 1-12. Devuelve ISO ("" si no hay).
export function nthBusinessDay(year: number, month: number, n: number): string {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d += 1) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) {
      count += 1;
      if (count === n) return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return "";
}

// Fecha de pago del sueldo: SIEMPRE el 4to día hábil del mes SIGUIENTE al período (LCT art. 128).
export function paymentDateForPeriod(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const ny = mo === 12 ? y + 1 : y;
  const nm = mo === 12 ? 1 : mo + 1;
  return nthBusinessDay(ny, nm, 4);
}

// Prorrateo del negro por dias trabajados. Sin descuentos salvo por dias no trabajados.
// negro = totalBlack / diasLaborables x diasTrabajados (clamp 0..total).
// EXCEPCION `sinProrrateo`: el socio / socio gerente cobra su acordado entero, no ficha horas.
export function reciboNegroAmount({
  totalBlack,
  workingDays,
  daysWorked,
  sinProrrateo,
}: {
  totalBlack: number;
  workingDays: number;
  daysWorked: number;
  // Socio / socio gerente: cobra el acordado COMPLETO, no se prorratea por dias trabajados.
  sinProrrateo?: boolean;
}): number {
  const t = Number(totalBlack || 0);
  if (!(t > 0)) return 0;
  if (sinProrrateo) return Math.round(t * 100) / 100;
  const wd = Number(workingDays || 0);
  const dw = Math.max(0, Number(daysWorked || 0));
  if (!(wd > 0)) return 0;
  const raw = (t / wd) * dw;
  return Math.max(0, Math.min(t, Math.round(raw * 100) / 100));
}

// --- Número a letras (es-AR) para el neto del recibo: "... CON 12/100" ---
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const ESPECIALES: Record<number, string> = {
  10: "DIEZ", 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
  16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
  20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
  25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE",
};
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function trioALetras(n: number): string {
  // n: 0..999
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let out = CENTENAS[c];
  if (resto > 0) {
    let restoTxt: string;
    if (resto < 10) restoTxt = UNIDADES[resto];
    else if (ESPECIALES[resto]) restoTxt = ESPECIALES[resto];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      restoTxt = DECENAS[d] + (u > 0 ? " Y " + UNIDADES[u] : "");
    }
    out = out ? `${out} ${restoTxt}` : restoTxt;
  }
  return out;
}

export function numeroALetras(value: number): string {
  const n = Math.max(0, Math.floor(Math.abs(Number(value) || 0)));
  const centavos = Math.round((Math.abs(Number(value) || 0) - n) * 100);
  const cent = String(centavos).padStart(2, "0");
  if (n === 0) return `CERO CON ${cent}/100`;

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const parts: string[] = [];
  if (millones > 0) parts.push(millones === 1 ? "UN MILLON" : `${trioALetras(millones)} MILLONES`);
  if (miles > 0) parts.push(miles === 1 ? "MIL" : `${trioALetras(miles)} MIL`);
  if (resto > 0) parts.push(trioALetras(resto));

  return `${parts.join(" ").trim()} CON ${cent}/100`;
}
