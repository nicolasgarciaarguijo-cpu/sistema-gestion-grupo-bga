// Opcion A de la RESERVA: el sistema la CALCULA solo, juntando lo que ya vive en el sistema.
// Toma el saldo inicial (cierre de octubre 2025, validado contra el banco) + los movimientos de
// cada fuente, y los mapea a los inputs del dominio de reserva (ver reserva.ts).
//
// Fuentes y a que billetera van:
//   - Extractos bancarios (BankStatementEntry) -> banco / pesos / BLANCO (la plata del banco es blanca).
//     credito = ingreso, debito = egreso.
//   - Caja chica: la asignacion de un fondo entra al EFECTIVO (partida por blanco/negro segun
//     assignedWhite/assignedBlack); cada gasto sale del EFECTIVO con su color (administration).
//
// Saldo inicial (cierre oct-2025, de la reconciliacion banco↔planilla):
//   De Raíz Patagonia = 4.302.064,53 ; BGA (Patagonia −37.786,98 + Santander 499.220,44) = 461.433,46.
//   La reserva junta los dos bancos de BGA en una sola billetera "banco/pesos".
//   Dólares = 0 (confirmado). Efectivo inicial = 0 (caja chica se arranca de cero).

import { aggregateReserva } from "./reserva";
import type { ReservaColor, ReservaMovementInput, ReservaOpening, ReservaSummary } from "./reserva";

// Saldo inicial banco/pesos por empresa (cierre oct-2025). Clave = CompanyName tal cual en el sistema.
export const RESERVA_OPENING_BANK_ARS: Record<string, number> = {
  "De raiz s.r.l": 4302064.53,
  "BGA estudio de diseño y produccion industrial s.r.l": 461433.46,
};

export type BankEntryLike = {
  date: string;
  movementType: "credito" | "debito";
  amount: number;
};

export type PettyFundLike = {
  deliveredDate: string;
  assignedAmount: number;
  assignedWhite?: number;
  assignedBlack?: number;
};

export type PettyExpenseLike = {
  date: string;
  amount: number;
  administration: ReservaColor; // "blanco" | "negro"
};

export type ReservaSourcesInput = {
  openingBankArs?: number; // cierre oct de banco/pesos (0 si no se pasa)
  openingBankUsd?: number; // = 0 hoy
  openingCashArs?: number; // efectivo inicial (0 hoy)
  openingCashUsd?: number;
  bankEntries?: BankEntryLike[];
  pettyCashFunds?: PettyFundLike[];
  pettyCashExpenses?: PettyExpenseLike[];
  until?: string; // corte por fecha (yyyy-mm-dd) para ver la reserva a un mes dado
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Mapea los extractos bancarios a movimientos de reserva (banco / pesos / blanco).
export function bankEntriesToMovements(entries: BankEntryLike[]): ReservaMovementInput[] {
  return entries.map((e) => ({
    date: e.date,
    currency: "ARS",
    location: "banco",
    color: "blanco",
    kind: e.movementType === "credito" ? "ingreso" : "egreso",
    amount: num(e.amount),
  }));
}

// Mapea caja chica a movimientos de EFECTIVO. La asignacion del fondo entra; cada gasto sale.
export function pettyCashToMovements(
  funds: PettyFundLike[],
  expenses: PettyExpenseLike[]
): ReservaMovementInput[] {
  const out: ReservaMovementInput[] = [];

  funds.forEach((f) => {
    const white = f.assignedWhite !== undefined ? num(f.assignedWhite) : num(f.assignedAmount);
    const black = num(f.assignedBlack);
    // Si no hay desglose, todo el fondo se considera blanco.
    const whiteAmount = f.assignedWhite === undefined && f.assignedBlack === undefined ? num(f.assignedAmount) : white;
    if (whiteAmount > 0)
      out.push({ date: f.deliveredDate, currency: "ARS", location: "efectivo", color: "blanco", kind: "ingreso", amount: whiteAmount });
    if (black > 0)
      out.push({ date: f.deliveredDate, currency: "ARS", location: "efectivo", color: "negro", kind: "ingreso", amount: black });
  });

  expenses.forEach((e) => {
    out.push({
      date: e.date,
      currency: "ARS",
      location: "efectivo",
      color: e.administration === "negro" ? "negro" : "blanco",
      kind: "egreso",
      amount: num(e.amount),
    });
  });

  return out;
}

// Arma la reserva de UNA empresa desde las fuentes del sistema.
export function buildReservaFromSources(input: ReservaSourcesInput): ReservaSummary {
  const openings: ReservaOpening[] = [
    { currency: "ARS", location: "banco", color: "blanco", amount: num(input.openingBankArs) },
    { currency: "USD", location: "banco", color: "blanco", amount: num(input.openingBankUsd) },
    { currency: "ARS", location: "efectivo", color: "blanco", amount: num(input.openingCashArs) },
    { currency: "USD", location: "efectivo", color: "blanco", amount: num(input.openingCashUsd) },
  ];

  const movements: ReservaMovementInput[] = [
    ...bankEntriesToMovements(input.bankEntries || []),
    ...pettyCashToMovements(input.pettyCashFunds || [], input.pettyCashExpenses || []),
  ];

  return aggregateReserva({ openings, movements, until: input.until });
}
