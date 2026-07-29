// Agregación de consumos de TARJETA para COTIZACIÓN y marcadores.
//
// El itemizado de la tarjeta NO va al estado de resultados: sirve para identificar cuánto se gasta
// fijo y variable por rubro, y así preparar los marcadores que alimentan el precio de los
// presupuestos. Pesos y dólares NUNCA se suman: son totales separados.
//
// Puro y testeado.

import type { CostGroup, CreditCardConsumption } from "./types";

export type CardCostKind = "fijo" | "variable";

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// El GRUPO define fijo/variable (igual que en la solapa Costos). Fallback: variable.
export function resolveCardGroupKind(groupName: string, groups: CostGroup[]): CardCostKind {
  const g = (groups || []).find((x) => x.name === groupName);
  return g?.kind === "fijo" ? "fijo" : "variable";
}

export type CardKindTotals = { fijo: number; variable: number; total: number };
export type CardGroupRow = {
  group: string;
  kind: CardCostKind;
  currency: "ARS" | "USD";
  total: number; // total del período
  recurringMonthly: number; // suma de los consumos marcados "recurrente" (insumo directo del marcador)
};
export type CardCostSummary = {
  ars: CardKindTotals;
  usd: CardKindTotals;
  byGroup: CardGroupRow[]; // ordenado: fijo antes que variable, luego por total desc
};

const emptyTotals = (): CardKindTotals => ({ fijo: 0, variable: 0, total: 0 });

// Agrega los consumos por grupo y moneda, separando fijo/variable. `recurringMonthly` junta lo que se
// repite todos los meses (lo que conviene volcar al marcador).
export function aggregateCardCosts(
  consumptions: CreditCardConsumption[],
  groups: CostGroup[]
): CardCostSummary {
  const ars = emptyTotals();
  const usd = emptyTotals();
  const map = new Map<string, CardGroupRow>();

  for (const c of consumptions || []) {
    const amount = num(c.amount);
    if (amount <= 0) continue;
    const currency: "ARS" | "USD" = c.currency === "USD" ? "USD" : "ARS";
    const group = c.group || "(sin clasificar)";
    const kind = c.group ? resolveCardGroupKind(c.group, groups) : "variable";

    const totals = currency === "USD" ? usd : ars;
    totals[kind] += amount;
    totals.total += amount;

    const key = `${group}||${currency}`;
    const row =
      map.get(key) ||
      (() => {
        const r: CardGroupRow = { group, kind, currency, total: 0, recurringMonthly: 0 };
        map.set(key, r);
        return r;
      })();
    row.total += amount;
    if (c.recurring) row.recurringMonthly += amount;
  }

  const byGroup = Array.from(map.values()).sort(
    (a, b) =>
      (a.kind === b.kind ? 0 : a.kind === "fijo" ? -1 : 1) ||
      a.currency.localeCompare(b.currency) ||
      b.total - a.total
  );

  return { ars, usd, byGroup };
}
