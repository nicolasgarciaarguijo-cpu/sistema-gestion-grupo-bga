// DEUDAS Y APORTES: un REGISTRO de la plata que entró para que la empresa funcione. Decisión del
// usuario: "solo asentadas, que no hagan mucho más que ser asentadas", con la evolución visible.
//
// NO toca el estado de resultados y NO empuja nada automáticamente. Tampoco alimenta la reserva como
// movimiento: esa plata YA está en el saldo del banco (entró por transferencia), contarla de nuevo
// sería doble conteo. La única conexión con la reserva es una lectura derivada: de la plata que hay,
// cuánta es préstamo a devolver → "excedente" = reserva − préstamos pendientes (el saneamiento).
//
// Aporte vs préstamo: el APORTE no vuelve (es capital); el PRÉSTAMO se devuelve cuando hay excedente.
// Por eso distinguimos, y con la dirección (recibido/devuelto) sale la deuda viva.
// Pesos y dólares no se mezclan: el monto va en pesos y el USD es solo un valor congelado de
// referencia (para "fijar valor"), nunca se suma con los pesos.

import type { CompanyName } from "./types";

export type CapitalKind = "aporte" | "prestamo";
export type CapitalDirection = "recibido" | "devuelto";
export type CapitalColor = "blanco" | "negro";

export type CapitalEntry = {
  id: number;
  company: CompanyName;
  date: string; // "yyyy-mm-dd"
  origin: string; // Gustavo, Nicolás, banco, la otra empresa, etc.
  kind: CapitalKind; // aporte (no vuelve) | prestamo (vuelve)
  direction: CapitalDirection; // recibido (entró plata) | devuelto (se devolvió)
  color: CapitalColor;
  amount: number; // pesos
  usdValue?: number; // monto congelado en USD (solo referencia, no se suma con pesos)
  notes: string;
};

export type CapitalColorSplit = { blanco: number; negro: number; total: number };

export type CapitalOriginRow = {
  origin: string;
  aporte: number; // aporte neto
  prestamoPendiente: number; // préstamo neto (deuda viva)
  total: number;
};

export type CapitalSummary = {
  aportes: CapitalColorSplit; // aportes netos (recibido − devuelto): capital permanente
  prestamosRecibidos: number;
  prestamosDevueltos: number;
  prestamosPendientes: CapitalColorSplit; // recibido − devuelto: la deuda viva
  totalRecibido: number; // toda la plata que entró (aporte + préstamo, solo "recibido")
  byOrigin: CapitalOriginRow[]; // quién puso cuánto
  usdReference: number; // suma de valores congelados en USD (referencia, aparte de los pesos)
  count: number;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// recibido suma, devuelto resta
const signed = (e: CapitalEntry) => (e.direction === "devuelto" ? -1 : 1) * num(e.amount);

const emptySplit = (): CapitalColorSplit => ({ blanco: 0, negro: 0, total: 0 });

const addToSplit = (split: CapitalColorSplit, color: CapitalColor, value: number) => {
  if (color === "negro") split.negro += value;
  else split.blanco += value;
  split.total += value;
};

export function summarizeContributions(entries: CapitalEntry[]): CapitalSummary {
  const aportes = emptySplit();
  const prestamosPendientes = emptySplit();
  let prestamosRecibidos = 0;
  let prestamosDevueltos = 0;
  let totalRecibido = 0;
  let usdReference = 0;
  const origins = new Map<string, CapitalOriginRow>();

  entries.forEach((e) => {
    const color: CapitalColor = e.color === "negro" ? "negro" : "blanco";
    const s = signed(e);
    if (e.direction === "recibido") totalRecibido += num(e.amount);
    usdReference += (e.direction === "devuelto" ? -1 : 1) * num(e.usdValue);

    const originKey = (e.origin || "").trim() || "Sin origen";
    const row = origins.get(originKey) || { origin: originKey, aporte: 0, prestamoPendiente: 0, total: 0 };

    if (e.kind === "prestamo") {
      addToSplit(prestamosPendientes, color, s);
      if (e.direction === "devuelto") prestamosDevueltos += num(e.amount);
      else prestamosRecibidos += num(e.amount);
      row.prestamoPendiente += s;
    } else {
      addToSplit(aportes, color, s);
      row.aporte += s;
    }
    row.total = row.aporte + row.prestamoPendiente;
    origins.set(originKey, row);
  });

  const byOrigin = Array.from(origins.values()).sort((a, b) => b.total - a.total);

  return {
    aportes,
    prestamosRecibidos,
    prestamosDevueltos,
    prestamosPendientes,
    totalRecibido,
    byOrigin,
    usdReference,
    count: entries.length,
  };
}
