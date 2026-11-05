// Núcleo del recibo de sueldo (blanco legal + negro interno). Puro y testeable.
import { esFeriado } from "./feriadosArgentina";

// Jornada de lunes a viernes: 07:30 a 17:00 con media hora de almuerzo.
export const HORAS_JORNADA_HABIL = 9;

// Días HÁBILES de un mes: lunes a viernes sin feriados (Nicolás, 05/11/2026). El sábado no cuenta.
export function diasHabilesDelMes(monthKey: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
  if (!m) return 0;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dow = new Date(year, month - 1, d).getDay(); // 0=Dom ... 6=Sáb
    if (dow === 0 || dow === 6) continue;
    if (esFeriado(`${m[1]}-${m[2]}-${String(d).padStart(2, "0")}`)) continue;
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

// Prorrateo del negro por HORAS (Nicolás, 05/11/2026): el arreglo dividido las horas laborables del mes
// (días hábiles en horas) por las horas trabajadas. Nunca pasa del arreglo.
// EXCEPCION `sinProrrateo`: el socio / socio gerente cobra su acordado entero, no ficha horas.
export function reciboNegroAmount({
  totalBlack,
  horasLaborables,
  horasTrabajadas,
  sinProrrateo,
}: {
  totalBlack: number;
  horasLaborables: number;
  horasTrabajadas: number;
  // Socio / socio gerente: cobra el acordado COMPLETO, no se prorratea por horas trabajadas.
  sinProrrateo?: boolean;
}): number {
  const t = Number(totalBlack || 0);
  if (!(t > 0)) return 0;
  if (sinProrrateo) return Math.round(t * 100) / 100;
  const laborables = Number(horasLaborables || 0);
  const trabajadas = Math.max(0, Number(horasTrabajadas || 0));
  if (!(laborables > 0)) return 0;
  const raw = (t / laborables) * trabajadas;
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

// LO QUE SE ENTREGA EN NEGRO EN EL MES (Nicolas, 2026-10-16): la MISMA regla para el recibo negro y para la
// ficha de pago de haberes, asi no dicen montos distintos.
//   - ACUERDO = lo acordado por el tipo de empleado (fuera de convenio: su negro acordado; temporal: su
//     sueldo) + el acuerdo del mes (cashBonus). Se PRORRATEA por horas trabajadas, salvo el socio / socio
//     gerente y el temporal por dia (ese ya sale de tarifa x dias).
//   - PREMIO = monto fijo, va entero.
export function negroDelMes({
  acordadoPorTipo,
  acuerdoDelMes,
  premio,
  horasLaborables,
  horasTrabajadas,
  sinProrrateo,
}: {
  acordadoPorTipo: number;
  acuerdoDelMes: number;
  premio: number;
  horasLaborables: number;
  horasTrabajadas: number;
  sinProrrateo?: boolean;
}): { acuerdoTotal: number; acuerdoAEntregar: number; premio: number; total: number } {
  const acuerdoTotal = Math.round((Math.max(0, Number(acordadoPorTipo || 0)) + Math.max(0, Number(acuerdoDelMes || 0))) * 100) / 100;
  const acuerdoAEntregar = reciboNegroAmount({ totalBlack: acuerdoTotal, horasLaborables, horasTrabajadas, sinProrrateo });
  const p = Math.max(0, Number(premio || 0));
  return { acuerdoTotal, acuerdoAEntregar, premio: p, total: Math.round((acuerdoAEntregar + p) * 100) / 100 };
}
