import {
  COST_GROUP_PAYROLL,
  COST_GROUP_PETTY_CASH,
  COST_GROUP_PURCHASES,
  DEFAULT_COST_GROUP_SEEDS,
  aggregateCosts,
  buildCostRows,
  costMonthKey,
  fiscalMonthKeys,
  isAutoCostGroup,
  monthKeyLabel,
  resolveGroupKind,
  suggestedFixedMonthlyByGroup,
} from "./costs";
import type { CostGroup, CostEntry } from "./types";

const groups: CostGroup[] = DEFAULT_COST_GROUP_SEEDS.map((seed, index) => ({
  id: index + 1,
  name: seed.name,
  kind: seed.kind,
  company: "General",
  active: true,
  auto: seed.auto,
  notes: "",
}));

const entry = (over: Partial<CostEntry>): CostEntry => ({
  id: 1,
  company: "BGA",
  date: "2025-11-10",
  group: "Edilicios",
  description: "Alquiler",
  amount: 100,
  administration: "blanco",
  source: "manual",
  supplier: "",
  notes: "",
  ...over,
});

describe("costMonthKey", () => {
  it("saca el mes de una fecha ISO", () => {
    expect(costMonthKey("2025-11-10")).toBe("2025-11");
  });

  it("devuelve vacio si la fecha es invalida o esta vacia", () => {
    expect(costMonthKey("")).toBe("");
    expect(costMonthKey("no-es-fecha")).toBe("");
  });
});

describe("fiscalMonthKeys", () => {
  it("da los 12 meses del ano fiscal cruzando el fin de ano", () => {
    const months = fiscalMonthKeys(11, 2025);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2025-11");
    expect(months[1]).toBe("2025-12");
    expect(months[2]).toBe("2026-01");
    expect(months[11]).toBe("2026-10");
  });

  it("funciona con ano fiscal calendario (enero)", () => {
    const months = fiscalMonthKeys(1, 2026);
    expect(months[0]).toBe("2026-01");
    expect(months[11]).toBe("2026-12");
  });
});

describe("monthKeyLabel", () => {
  it("etiqueta un mes", () => {
    expect(monthKeyLabel("2025-11")).toContain("2025");
  });

  it("no rompe con basura", () => {
    expect(monthKeyLabel("")).toBe("-");
  });
});

describe("resolveGroupKind / isAutoCostGroup", () => {
  it("usa el tipo del grupo definido", () => {
    expect(resolveGroupKind(groups, "Edilicios")).toBe("fijo");
    expect(resolveGroupKind(groups, COST_GROUP_PURCHASES)).toBe("variable");
  });

  it("un grupo desconocido cae en variable (no infla los costos fijos)", () => {
    expect(resolveGroupKind(groups, "Inventado")).toBe("variable");
  });

  it("reconoce los grupos automaticos", () => {
    expect(isAutoCostGroup(COST_GROUP_PURCHASES)).toBe(true);
    expect(isAutoCostGroup(COST_GROUP_PETTY_CASH)).toBe(true);
    expect(isAutoCostGroup(COST_GROUP_PAYROLL)).toBe(true);
    expect(isAutoCostGroup("Edilicios")).toBe(false);
  });
});

describe("buildCostRows", () => {
  it("manda compras a variable, caja chica a variable y nomina a fijo", () => {
    const rows = buildCostRows({
      entries: [],
      purchases: [
        { company: "BGA", invoiceDate: "2025-11-05", total: 500, administration: "blanco" },
      ],
      pettyCash: [{ company: "BGA", date: "2025-11-06", amount: 50, administration: "negro" }],
      payroll: [{ company: "BGA", month: "2025-11", white: 900, black: 100 }],
    });

    expect(rows.find((r) => r.origin === "compras")?.group).toBe(COST_GROUP_PURCHASES);
    expect(rows.find((r) => r.origin === "cajaChica")?.group).toBe(COST_GROUP_PETTY_CASH);
    const payrollRows = rows.filter((r) => r.origin === "personal");
    expect(payrollRows).toHaveLength(2);
    expect(payrollRows.find((r) => r.administration === "blanco")?.amount).toBe(900);
    expect(payrollRows.find((r) => r.administration === "negro")?.amount).toBe(100);
    // la nomina se fecha al dia 1 del mes
    expect(payrollRows[0].date).toBe("2025-11-01");
  });

  it("descarta montos en cero o negativos", () => {
    const rows = buildCostRows({
      entries: [entry({ amount: 0 })],
      purchases: [{ company: "BGA", invoiceDate: "2025-11-05", total: -10, administration: "blanco" }],
      pettyCash: [],
      payroll: [{ company: "BGA", month: "2025-11", white: 0, black: 0 }],
    });
    expect(rows).toHaveLength(0);
  });

  it("conserva la administracion del gasto manual", () => {
    const rows = buildCostRows({
      entries: [entry({ administration: "negro" })],
      purchases: [],
      pettyCash: [],
      payroll: [],
    });
    expect(rows[0].administration).toBe("negro");
    expect(rows[0].origin).toBe("manual");
  });
});

describe("aggregateCosts", () => {
  const months = fiscalMonthKeys(11, 2025);

  it("separa fijos de variables y suma por mes", () => {
    const rows = buildCostRows({
      entries: [entry({ amount: 100, group: "Edilicios", date: "2025-11-10" })],
      purchases: [
        { company: "BGA", invoiceDate: "2025-11-05", total: 500, administration: "blanco" },
      ],
      pettyCash: [],
      payroll: [],
    });
    const agg = aggregateCosts({ months, groups, rows });

    expect(agg.fixedByMonth["2025-11"]).toBe(100);
    expect(agg.variableByMonth["2025-11"]).toBe(500);
    expect(agg.totalByMonth["2025-11"]).toBe(600);
    expect(agg.fixedTotal).toBe(100);
    expect(agg.variableTotal).toBe(500);
    expect(agg.total).toBe(600);
  });

  it("ignora gastos fuera del ano fiscal", () => {
    const rows = buildCostRows({
      entries: [entry({ date: "2025-10-31", amount: 999 })], // el ano arranca 2025-11
      purchases: [],
      pettyCash: [],
      payroll: [],
    });
    const agg = aggregateCosts({ months, groups, rows });
    expect(agg.total).toBe(0);
  });

  it("filtra por empresa", () => {
    const rows = buildCostRows({
      entries: [
        entry({ id: 1, company: "BGA", amount: 100 }),
        entry({ id: 2, company: "De raiz s.r.l", amount: 70 }),
      ],
      purchases: [],
      pettyCash: [],
      payroll: [],
    });
    expect(aggregateCosts({ months, groups, rows, companyScope: "BGA" }).total).toBe(100);
    expect(aggregateCosts({ months, groups, rows, companyScope: "De raiz s.r.l" }).total).toBe(70);
    expect(aggregateCosts({ months, groups, rows, companyScope: "__ALL__" }).total).toBe(170);
  });

  it("filtra por administracion blanco/negro", () => {
    const rows = buildCostRows({
      entries: [
        entry({ id: 1, administration: "blanco", amount: 100 }),
        entry({ id: 2, administration: "negro", amount: 30 }),
      ],
      purchases: [],
      pettyCash: [],
      payroll: [],
    });
    expect(aggregateCosts({ months, groups, rows, administration: "blanco" }).total).toBe(100);
    expect(aggregateCosts({ months, groups, rows, administration: "negro" }).total).toBe(30);
    expect(aggregateCosts({ months, groups, rows, administration: "todas" }).total).toBe(130);
  });

  it("muestra los grupos activos aunque no tengan movimientos", () => {
    const agg = aggregateCosts({ months, groups, rows: [] });
    expect(agg.rows.length).toBe(groups.length);
    expect(agg.total).toBe(0);
  });

  it("no pierde plata de un grupo huerfano (borrado o viejo)", () => {
    const rows = buildCostRows({
      entries: [entry({ group: "Grupo viejo", amount: 42 })],
      purchases: [],
      pettyCash: [],
      payroll: [],
    });
    const agg = aggregateCosts({ months, groups, rows });
    const orphan = agg.rows.find((r) => r.group === "Grupo viejo");
    expect(orphan?.total).toBe(42);
    expect(agg.total).toBe(42);
  });

  it("ordena fijos primero", () => {
    const agg = aggregateCosts({ months, groups, rows: [] });
    const firstVariable = agg.rows.findIndex((r) => r.kind === "variable");
    const lastFixed = agg.rows.map((r) => r.kind).lastIndexOf("fijo");
    expect(lastFixed).toBeLessThan(firstVariable);
  });

  it("cuenta los meses con datos", () => {
    const rows = buildCostRows({
      entries: [
        entry({ id: 1, date: "2025-11-10", amount: 100 }),
        entry({ id: 2, date: "2025-12-10", amount: 120 }),
      ],
      purchases: [],
      pettyCash: [],
      payroll: [],
    });
    const agg = aggregateCosts({ months, groups, rows });
    expect(agg.rows.find((r) => r.group === "Edilicios")?.monthsWithData).toBe(2);
  });
});

describe("suggestedFixedMonthlyByGroup", () => {
  const months = fiscalMonthKeys(11, 2025);

  it("promedia solo sobre los meses cargados", () => {
    const rows = buildCostRows({
      entries: [
        entry({ id: 1, date: "2025-11-10", amount: 100 }),
        entry({ id: 2, date: "2025-12-10", amount: 200 }),
      ],
      purchases: [],
      pettyCash: [],
      payroll: [],
    });
    const agg = aggregateCosts({ months, groups, rows });
    const suggestion = suggestedFixedMonthlyByGroup(agg).find((s) => s.group === "Edilicios");
    // 300 en 2 meses cargados -> 150, no 300/12
    expect(suggestion?.monthlyAverage).toBe(150);
    expect(suggestion?.monthsWithData).toBe(2);
  });

  it("no sugiere nada para grupos variables ni para grupos sin datos", () => {
    const rows = buildCostRows({
      entries: [],
      purchases: [
        { company: "BGA", invoiceDate: "2025-11-05", total: 500, administration: "blanco" },
      ],
      pettyCash: [],
      payroll: [],
    });
    const agg = aggregateCosts({ months, groups, rows });
    const suggestions = suggestedFixedMonthlyByGroup(agg);
    expect(suggestions.find((s) => s.group === COST_GROUP_PURCHASES)).toBeUndefined();
    expect(suggestions).toHaveLength(0);
  });
});
