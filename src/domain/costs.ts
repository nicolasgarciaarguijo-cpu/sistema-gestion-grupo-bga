// Costos fijos y variables: clasificacion por grupo y agregacion mes a mes del ano fiscal.
// Funciones puras y testeadas; sin React ni estado.
//
// Regla base: el GRUPO define si un gasto es fijo o variable (no el item).
//
// De donde sale la plata (decidido con el usuario):
//   - Compras          -> grupo automatico "Compras y materiales" (variable)
//   - Caja chica       -> grupo automatico "Caja chica"           (variable)
//   - Personal (sueldos)-> grupo automatico "Personal"            (fijo)
//   - Todo lo demas (alquiler, servicios, impuestos...) -> se carga a mano o por extracto
//     bancario en la solapa Costos, en grupos NO automaticos.
// Los grupos automaticos se agregan solos desde sus solapas: nunca se cargan a mano, asi el
// mismo gasto no se cuenta dos veces (ni aca ni en el estado de resultados).

import type { CostEntry, CostGroup, CostKind, CompanyName } from "./types";

export const COST_GROUP_PURCHASES = "Compras y materiales";
export const COST_GROUP_PETTY_CASH = "Caja chica";
export const COST_GROUP_PAYROLL = "Personal";

// Grupos automaticos: se alimentan de otras solapas, no admiten carga manual.
// "Compras y materiales" SALIO de esta lista (2026-07-19): la factura de compra ya no es el gasto,
// el gasto es el PAGO. Ahora es un grupo comun, para poder imputarle los pagos a proveedores.
export const AUTO_COST_GROUPS: readonly string[] = [COST_GROUP_PETTY_CASH, COST_GROUP_PAYROLL];

// Semilla de grupos. Los 5 primeros son los mismos "grandes grupos" que Marcadores ya usa
// en "costos fijos por grupo" (DEFAULT_FIXED_MARKER_GROUPS en App.tsx).
export const DEFAULT_COST_GROUP_SEEDS: Array<{ name: string; kind: CostKind; auto: boolean }> = [
  { name: "Administrativos", kind: "fijo", auto: false },
  { name: "Comerciales", kind: "fijo", auto: false },
  { name: "Financieros", kind: "fijo", auto: false },
  { name: "Edilicios", kind: "fijo", auto: false },
  { name: "Operativos", kind: "fijo", auto: false },
  { name: COST_GROUP_PAYROLL, kind: "fijo", auto: true },
  { name: COST_GROUP_PURCHASES, kind: "variable", auto: false },
  { name: COST_GROUP_PETTY_CASH, kind: "variable", auto: true },
];

export function isAutoCostGroup(name: string): boolean {
  return AUTO_COST_GROUPS.includes(name);
}

// Mes "yyyy-mm" de una fecha ISO. "" si la fecha es invalida.
export function costMonthKey(dateStr: string): string {
  if (!dateStr) return "";
  const d = dateStr.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(d) ? d : "";
}

// Los 12 meses "yyyy-mm" del ano fiscal que arranca en (startYear, startMonth), en orden.
export function fiscalMonthKeys(startMonth: number, startYear: number): string[] {
  const sm = Math.min(12, Math.max(1, Math.round(startMonth)));
  const months: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const monthIndex = sm - 1 + i;
    const year = startYear + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    months.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return months;
}

// Etiqueta corta de un mes "yyyy-mm" -> "nov 2025".
export function monthKeyLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || "-";
  const [y, m] = monthKey.split("-").map(Number);
  const name = new Date(y, m - 1, 1)
    .toLocaleDateString("es-AR", { month: "short" })
    .replace(".", "");
  return `${name} ${y}`;
}

// Tipo (fijo/variable) de un grupo. Si el grupo no esta definido cae en la semilla y,
// si tampoco esta, en "variable" (lo desconocido no infla los costos fijos del presupuesto).
export function resolveGroupKind(groups: CostGroup[], name: string): CostKind {
  const found = groups.find((g) => g.name === name);
  if (found) return found.kind;
  const seed = DEFAULT_COST_GROUP_SEEDS.find((g) => g.name === name);
  return seed ? seed.kind : "variable";
}

// Vista jerarquica: fijo/variable -> grupo -> gastos individuales (CostEntry) asignados debajo.
// Solo los PAGOS cargados (costEntries); caja chica y sueldos van por grupos auto y no son CostEntry.
export type CostGroupComposition = {
  group: string;
  kind: CostKind;
  auto: boolean;
  entries: CostEntry[];
  total: number;
};

const sumEntries = (es: CostEntry[]) => es.reduce((a, e) => a + Number(e.amount || 0), 0);
const sortEntriesByDateDesc = (es: CostEntry[]) =>
  [...es].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);

export function composeCostEntriesByGroup(
  entries: CostEntry[],
  groups: CostGroup[],
  companyScope: string = "__ALL__"
): {
  fijos: CostGroupComposition[];
  variables: CostGroupComposition[];
  sinClasificar: { entries: CostEntry[]; total: number };
} {
  const inScope = entries.filter((e) => companyScope === "__ALL__" || e.company === companyScope);
  const byGroup = new Map<string, CostEntry[]>();
  for (const e of inScope) {
    const g = e.group || "";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(e);
  }
  const activeGroups = groups.filter((g) => g.active !== false);
  const activeNames = new Set(activeGroups.map((g) => g.name));
  const comps: CostGroupComposition[] = [];
  // Grupos activos (aparecen aunque no tengan gastos, para ver la estructura completa).
  for (const g of activeGroups) {
    const es = byGroup.get(g.name) || [];
    comps.push({ group: g.name, kind: g.kind, auto: !!g.auto, entries: sortEntriesByDateDesc(es), total: sumEntries(es) });
  }
  // Grupos "huerfanos": nombres usados por gastos que ya no existen como grupo activo.
  byGroup.forEach((es, name) => {
    if (!name || activeNames.has(name)) return;
    comps.push({ group: name, kind: resolveGroupKind(groups, name), auto: false, entries: sortEntriesByDateDesc(es), total: sumEntries(es) });
  });
  const byName = (a: CostGroupComposition, b: CostGroupComposition) => a.group.localeCompare(b.group);
  const sinEs = sortEntriesByDateDesc(byGroup.get("") || []);
  return {
    fijos: comps.filter((c) => c.kind === "fijo").sort(byName),
    variables: comps.filter((c) => c.kind === "variable").sort(byName),
    sinClasificar: { entries: sinEs, total: sumEntries(sinEs) },
  };
}

// Fila normalizada: todo gasto (venga de donde venga) se reduce a esto antes de agregar.
export type CostSourceRow = {
  company: CompanyName;
  date: string; // ISO yyyy-mm-dd
  group: string;
  amount: number;
  administration: "blanco" | "negro";
  origin: "manual" | "extracto" | "compras" | "cajaChica" | "personal";
};

export type CostSourcesInput = {
  // Los PAGOS (lo que salio de la empresa). Es el gasto real; la factura de compra es solo registro.
  entries: CostEntry[];
  pettyCash: Array<{
    company: CompanyName;
    date: string;
    amount: number;
    administration: "blanco" | "negro";
    // Grupo asignado al gasto de caja chica. Ausente/"" -> cae en el grupo auto "Caja chica".
    costGroup?: string;
  }>;
  // Nomina ya resuelta por mes: blanco = impacto patronal, negro = pagos en negro.
  payroll: Array<{
    company: CompanyName;
    month: string; // "yyyy-mm"
    white: number;
    black: number;
  }>;
};

// Normaliza todas las fuentes a CostSourceRow[]. Los montos <= 0 se descartan.
export function buildCostRows(input: CostSourcesInput): CostSourceRow[] {
  const rows: CostSourceRow[] = [];

  input.entries.forEach((entry) => {
    const amount = Number(entry.amount || 0);
    if (!(amount > 0)) return;
    rows.push({
      company: entry.company,
      date: entry.date,
      group: entry.group,
      amount,
      administration: entry.administration,
      origin: entry.source,
    });
  });

  input.pettyCash.forEach((exp) => {
    const amount = Number(exp.amount || 0);
    if (!(amount > 0)) return;
    rows.push({
      company: exp.company,
      date: exp.date,
      // Si el usuario clasifico el gasto de caja chica a un grupo, va ahi; si no, al grupo auto.
      group: exp.costGroup && exp.costGroup.trim() ? exp.costGroup.trim() : COST_GROUP_PETTY_CASH,
      amount,
      administration: exp.administration,
      origin: "cajaChica",
    });
  });

  input.payroll.forEach((pr) => {
    const month = costMonthKey(pr.month.length === 7 ? `${pr.month}-01` : pr.month);
    if (!month) return;
    const date = `${month}-01`;
    const white = Number(pr.white || 0);
    const black = Number(pr.black || 0);
    if (white > 0) {
      rows.push({
        company: pr.company,
        date,
        group: COST_GROUP_PAYROLL,
        amount: white,
        administration: "blanco",
        origin: "personal",
      });
    }
    if (black > 0) {
      rows.push({
        company: pr.company,
        date,
        group: COST_GROUP_PAYROLL,
        amount: black,
        administration: "negro",
        origin: "personal",
      });
    }
  });

  return rows;
}

export type CostGroupMonthlyRow = {
  group: string;
  kind: CostKind;
  auto: boolean;
  byMonth: Record<string, number>;
  total: number;
  // Meses (dentro del periodo) con al menos un movimiento: sirve para promediar sin
  // ensuciar el promedio con meses que todavia no se cargaron.
  monthsWithData: number;
};

export type CostAggregation = {
  rows: CostGroupMonthlyRow[];
  fixedByMonth: Record<string, number>;
  variableByMonth: Record<string, number>;
  totalByMonth: Record<string, number>;
  fixedTotal: number;
  variableTotal: number;
  total: number;
};

export type CostAggregationInput = {
  months: string[];
  groups: CostGroup[];
  rows: CostSourceRow[];
  // Empresa a mirar; "__ALL__" = todas.
  companyScope?: CompanyName | "__ALL__";
  // Si se pasa, solo se cuentan gastos de esa administracion.
  administration?: "blanco" | "negro" | "todas";
};

const zeroByMonth = (months: string[]): Record<string, number> => {
  const acc: Record<string, number> = {};
  months.forEach((m) => {
    acc[m] = 0;
  });
  return acc;
};

// Agrega los gastos por grupo y por mes del periodo. Solo cuenta filas cuyo mes cae dentro
// de `months`: lo de afuera del ano fiscal se ignora.
export function aggregateCosts(input: CostAggregationInput): CostAggregation {
  const { months, groups, rows } = input;
  const scope = input.companyScope ?? "__ALL__";
  const admin = input.administration ?? "todas";
  const monthSet = new Set(months);

  const byGroup = new Map<string, CostGroupMonthlyRow>();

  // Los grupos activos arrancan en cero para que la grilla los muestre aunque no tengan
  // movimientos todavia (asi se ve que falta cargar, en vez de desaparecer).
  groups
    .filter((g) => g.active)
    .forEach((g) => {
      byGroup.set(g.name, {
        group: g.name,
        kind: g.kind,
        auto: g.auto,
        byMonth: zeroByMonth(months),
        total: 0,
        monthsWithData: 0,
      });
    });

  rows.forEach((row) => {
    if (scope !== "__ALL__" && row.company !== scope) return;
    if (admin !== "todas" && row.administration !== admin) return;
    const month = costMonthKey(row.date);
    if (!month || !monthSet.has(month)) return;
    const amount = Number(row.amount || 0);
    if (!(amount > 0)) return;

    let entry = byGroup.get(row.group);
    if (!entry) {
      // Grupo huerfano (se borro o el gasto quedo con un grupo viejo): igual se muestra
      // para que no desaparezca plata de la vista.
      entry = {
        group: row.group,
        kind: resolveGroupKind(groups, row.group),
        auto: isAutoCostGroup(row.group),
        byMonth: zeroByMonth(months),
        total: 0,
        monthsWithData: 0,
      };
      byGroup.set(row.group, entry);
    }
    entry.byMonth[month] = (entry.byMonth[month] || 0) + amount;
    entry.total += amount;
  });

  const result = Array.from(byGroup.values());
  result.forEach((row) => {
    row.monthsWithData = months.filter((m) => (row.byMonth[m] || 0) > 0).length;
  });
  result.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "fijo" ? -1 : 1;
    return a.group.localeCompare(b.group, "es");
  });

  const fixedByMonth = zeroByMonth(months);
  const variableByMonth = zeroByMonth(months);
  const totalByMonth = zeroByMonth(months);
  let fixedTotal = 0;
  let variableTotal = 0;

  result.forEach((row) => {
    months.forEach((m) => {
      const value = row.byMonth[m] || 0;
      if (row.kind === "fijo") fixedByMonth[m] += value;
      else variableByMonth[m] += value;
      totalByMonth[m] += value;
    });
    if (row.kind === "fijo") fixedTotal += row.total;
    else variableTotal += row.total;
  });

  return {
    rows: result,
    fixedByMonth,
    variableByMonth,
    totalByMonth,
    fixedTotal,
    variableTotal,
    total: fixedTotal + variableTotal,
  };
}

// Lo que la empresa gasta DE VERDAD, grupo por grupo: es lo que viaja al bloque
// "Costos empresariales" de Marcadores. Van TODOS los grupos, fijos y variables, para que ahi se
// vea el cuadro completo y no solo la mitad fija.
// El promedio se saca sobre los meses que TIENEN movimientos: si de doce meses cargaste tres,
// divide por tres. Si dividiera por doce, un ejercicio a medio cargar mostraria costos irreales
// bajos y los presupuestos saldrian baratos.
export type RealCostByGroup = {
  group: string;
  kind: CostKind;
  auto: boolean;
  monthlyAverage: number;
  monthsWithData: number;
  total: number;
};

export function realCostsByGroup(aggregation: CostAggregation): RealCostByGroup[] {
  return aggregation.rows.map((row) => ({
    group: row.group,
    kind: row.kind,
    auto: row.auto,
    monthlyAverage: row.monthsWithData > 0 ? row.total / row.monthsWithData : 0,
    monthsWithData: row.monthsWithData,
    total: row.total,
  }));
}

// Promedio mensual real de cada grupo FIJO, para sugerir el "monto mensual" de Marcadores.
export function suggestedFixedMonthlyByGroup(
  aggregation: CostAggregation
): Array<{ group: string; monthlyAverage: number; monthsWithData: number }> {
  return realCostsByGroup(aggregation)
    .filter((row) => row.kind === "fijo" && row.monthsWithData > 0)
    .map(({ group, monthlyAverage, monthsWithData }) => ({ group, monthlyAverage, monthsWithData }));
}
