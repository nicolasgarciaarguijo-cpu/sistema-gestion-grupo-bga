// PRESTAMOS DEL CALENDARIO -> una linea de deuda con el nombre del PRESTAMISTA.
//
// Regla del usuario (2026-08-19): "los prestamos deben armar una linea nueva en el bloque de deuda
// con el nombre del prestamista". La plata clasificada en la seccion PRESTAMOS del Calendario anual
// (un credito del banco o una carga manual) no es una ganancia: es plata que hay que devolver. Asi
// que arma sola su linea en "Deudas y aportes", sin tener que asentarla a mano.
//
// Anti doble conteo: si ese mismo prestamo YA estaba asentado a mano en Deudas y aportes, no se
// cuenta dos veces. El cruce usa el mismo criterio que el cotejo del banco (ver domain/suppliers.ts):
// mismo prestamista, mismo importe (tolerancia $1) y fechas cercanas; cada asiento a mano puede
// tapar UN solo movimiento (si no, dos prestamos iguales quedarian los dos asentados con un asiento).
//
// Puro: texto y aritmetica, sin estado ni fechas del sistema.

import { normalizeText } from "./suppliers";
import type { CapitalEntry } from "./contributions";

export type CalendarLoan = {
  id: string; // "bank-<id>" / "financial-<id>"
  company: string;
  date: string; // yyyy-mm-dd
  amount: number; // positivo: plata que entro
  lender: string; // nombre del prestamista (sale del renglon del calendario)
  color: "blanco" | "negro";
};

export type LoanMovement = CalendarLoan & {
  // Ya estaba asentado a mano en Deudas y aportes (no hay que volver a contarlo).
  asentado: boolean;
};

export type LoanLine = {
  lender: string;
  recibido: number; // todo lo que entro por el calendario a nombre de esa persona
  asentado: number; // la parte que ya estaba cargada a mano
  sinAsentar: number; // la parte que la linea agrega a la deuda (recibido - asentado)
  movimientos: LoanMovement[];
};

export const LOAN_AMOUNT_TOLERANCE = 1; // $1: redondeos
export const LOAN_DAY_WINDOW = 10; // el asiento a mano se carga unos dias despues del movimiento

// Nombres cortos generan falsos positivos ("SA" estaria adentro de cualquiera).
const MIN_NAME_LEN = 4;

// Clave para comparar prestamistas: sin acentos, sin puntuacion, sin espacios.
export const lenderKey = (name: string): string => normalizeText(name).replace(/ /g, "");

export function sameLender(a: string, b: string): boolean {
  const x = lenderKey(a);
  const y = lenderKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.length >= MIN_NAME_LEN && y.length >= MIN_NAME_LEN && (x.includes(y) || y.includes(x));
}

// El renglon se llama "Prestamo Nicolas"; el prestamista es "Nicolas".
export function lenderFromLabel(label: string): string {
  const raw = (label || "").trim();
  const clean = raw.replace(/^pr[eé]stamos?\s+(de\s+)?/i, "").trim();
  const name = clean || raw;
  if (!name) return "Sin nombre";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const dayDiff = (a: string, b: string): number => {
  const da = Date.parse(`${(a || "").slice(0, 10)}T00:00:00Z`);
  const db = Date.parse(`${(b || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(da) || Number.isNaN(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(da - db) / 86400000;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Una linea por prestamista con lo que entro por el calendario, marcando que parte ya estaba
// asentada a mano. Ordena por lo que mas entro.
export function buildLoanLines(
  loans: CalendarLoan[],
  capitalEntries: CapitalEntry[],
  opts?: { amountTolerance?: number; dayWindow?: number }
): LoanLine[] {
  const tol = opts?.amountTolerance ?? LOAN_AMOUNT_TOLERANCE;
  const win = opts?.dayWindow ?? LOAN_DAY_WINDOW;
  // Solo los prestamos RECIBIDOS a mano pueden tapar un movimiento del calendario.
  const asientos = (capitalEntries || []).filter(
    (e) => e.kind === "prestamo" && e.direction === "recibido"
  );
  const usados = new Set<number>();

  const movimientos: LoanMovement[] = [...(loans || [])]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map((loan) => {
      const monto = num(loan.amount);
      const asiento = asientos.find(
        (e) =>
          !usados.has(e.id) &&
          (!loan.company || !e.company || String(e.company) === loan.company) &&
          sameLender(e.origin, loan.lender) &&
          Math.abs(num(e.amount) - monto) <= tol &&
          dayDiff(e.date, loan.date) <= win
      );
      if (asiento) usados.add(asiento.id);
      return { ...loan, asentado: !!asiento };
    });

  const byLender = new Map<string, LoanLine>();
  movimientos.forEach((m) => {
    const key = lenderKey(m.lender) || "sin-nombre";
    const line =
      byLender.get(key) || { lender: m.lender, recibido: 0, asentado: 0, sinAsentar: 0, movimientos: [] };
    const monto = num(m.amount);
    line.recibido += monto;
    if (m.asentado) line.asentado += monto;
    line.sinAsentar = line.recibido - line.asentado;
    line.movimientos.push(m);
    byLender.set(key, line);
  });

  return Array.from(byLender.values()).sort(
    (a, b) => b.recibido - a.recibido || a.lender.localeCompare(b.lender)
  );
}
