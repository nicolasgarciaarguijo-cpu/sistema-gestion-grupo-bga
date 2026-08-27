import {
  COST_GROUP_PAYROLL,
  COST_GROUP_PETTY_CASH,
  COST_GROUP_PURCHASES,
  DEFAULT_COST_GROUP_SEEDS,
  aggregateCosts,
  buildCostRows,
  composeCostEntriesByGroup,
  costMonthKey,
  fiscalMonthKeys,
  isAutoCostGroup,
  monthKeyLabel,
  resolveGroupKind,
  realCostsByGroup,
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
    // Compras dejo de ser automatico: la factura ya no es el gasto, se le imputan los PAGOS a mano.
    expect(isAutoCostGroup(COST_GROUP_PURCHASES)).toBe(false);
    expect(isAutoCostGroup(COST_GROUP_PETTY_CASH)).toBe(true);
    expect(isAutoCostGroup(COST_GROUP_PAYROLL)).toBe(true);
    expect(isAutoCostGroup("Edilicios")).toBe(false);
  });
});

describe("buildCostRows", () => {
  it("manda el pago a su grupo, caja chica a variable y nomina a fijo", () => {
    const rows = buildCostRows({
      // El gasto es el PAGO: la factura de compra ya no entra (es solo registro).
      entries: [entry({ group: COST_GROUP_PURCHASES, amount: 500, date: "2025-11-05" })],
      pettyCash: [{ company: "BGA", date: "2025-11-06", amount: 50, administration: "negro" }],
      payroll: [{ company: "BGA", month: "2025-11", white: 900, black: 100 }],
    });

    expect(rows.find((r) => r.origin === "manual")?.group).toBe(COST_GROUP_PURCHASES);
    expect(rows.some((r) => r.origin === "compras")).toBe(false);
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
      pettyCash: [],
      payroll: [{ company: "BGA", month: "2025-11", white: 0, black: 0 }],
    });
    expect(rows).toHaveLength(0);
  });

  it("conserva la administracion del gasto manual", () => {
    const rows = buildCostRows({
      entries: [entry({ administration: "negro" })],
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
      entries: [
        entry({ amount: 100, group: "Edilicios", date: "2025-11-10" }),
        entry({ amount: 500, group: COST_GROUP_PURCHASES, date: "2025-11-05" }),
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
      pettyCash: [],
      payroll: [],
    });
    const agg = aggregateCosts({ months, groups, rows });
    const suggestions = suggestedFixedMonthlyByGroup(agg);
    expect(suggestions.find((s) => s.group === COST_GROUP_PURCHASES)).toBeUndefined();
    expect(suggestions).toHaveLength(0);
  });
});

describe("composeCostEntriesByGroup", () => {
  const grp: CostGroup[] = [
    { id: 1, name: "Alquiler", kind: "fijo", company: "General", active: true, auto: false, notes: "" },
    { id: 2, name: "Materiales", kind: "variable", company: "General", active: true, auto: false, notes: "" },
    { id: 3, name: "Servicios", kind: "fijo", company: "General", active: true, auto: false, notes: "" },
  ];
  const e = (over: Partial<CostEntry>): CostEntry => ({
    id: Math.floor(Math.random() * 1e6),
    company: "BGA estudio de diseño y produccion industrial s.r.l" as any,
    date: "2026-07-01",
    group: "",
    description: "",
    amount: 0,
    administration: "blanco",
    source: "manual",
    supplier: "",
    notes: "",
    ...over,
  });

  it("agrupa por grupo, separa fijos/variables y suma el total de cada uno", () => {
    const r = composeCostEntriesByGroup(
      [
        e({ group: "Alquiler", amount: 100000 }),
        e({ group: "Alquiler", amount: 50000 }),
        e({ group: "Materiales", amount: 30000 }),
      ],
      grp
    );
    const alq = r.fijos.find((g) => g.group === "Alquiler")!;
    expect(alq.total).toBe(150000);
    expect(alq.entries.length).toBe(2);
    expect(alq.kind).toBe("fijo");
    expect(r.variables.find((g) => g.group === "Materiales")!.total).toBe(30000);
  });

  it("los gastos sin grupo van a sinClasificar", () => {
    const r = composeCostEntriesByGroup([e({ group: "", amount: 7000 })], grp);
    expect(r.sinClasificar.total).toBe(7000);
  });

  it("un grupo activo sin gastos aparece igual con total 0", () => {
    const r = composeCostEntriesByGroup([], grp);
    expect(r.fijos.map((g) => g.group).sort()).toEqual(["Alquiler", "Servicios"]);
    expect(r.fijos.every((g) => g.total === 0)).toBe(true);
  });

  it("respeta el scope de empresa", () => {
    const r = composeCostEntriesByGroup(
      [
        e({ group: "Materiales", amount: 1000, company: "De raiz s.r.l" as any }),
        e({ group: "Materiales", amount: 2000, company: "BGA estudio de diseño y produccion industrial s.r.l" as any }),
      ],
      grp,
      "De raiz s.r.l"
    );
    expect(r.variables.find((g) => g.group === "Materiales")!.total).toBe(1000);
  });
});

describe("buildCostRows: caja chica clasificable", () => {
  it("caja chica va a su grupo asignado si lo tiene; si no, al grupo auto Caja chica", () => {
    const rows = buildCostRows({
      entries: [],
      pettyCash: [
        { company: "BGA", date: "2025-11-06", amount: 100, administration: "blanco", costGroup: "Edilicios" },
        { company: "BGA", date: "2025-11-07", amount: 50, administration: "negro" },
      ],
      payroll: [],
    });
    expect(rows.find((r) => r.amount === 100)?.group).toBe("Edilicios");
    expect(rows.find((r) => r.amount === 50)?.group).toBe(COST_GROUP_PETTY_CASH);
    // sigue siendo origen cajaChica (no se convierte en CostEntry -> no hay doble conteo)
    expect(rows.every((r) => r.origin === "cajaChica")).toBe(true);
  });
});

describe("realCostsByGroup: la foto que viaja a Costos empresariales", () => {
  const grupos: CostGroup[] = [
    { id: 1, name: "Alquiler", kind: "fijo", auto: false, active: true } as CostGroup,
    { id: 2, name: "Materiales", kind: "variable", auto: false, active: true } as CostGroup,
  ];
  const meses = ["2025-11", "2025-12", "2026-01"];
  const fila = (group: string, date: string, amount: number) => ({
    group, date, amount, company: "BGA" as any, administration: "blanco" as const, origin: "costo" as const,
  });

  it("trae los grupos FIJOS y los VARIABLES, no solo los fijos", () => {
    const agg = aggregateCosts({ months: meses, groups: grupos, rows: [] as any });
    expect(realCostsByGroup(agg).map((r) => r.group).sort()).toEqual(["Alquiler", "Materiales"]);
  });

  it("promedia sobre los meses CON movimientos, no sobre los del ejercicio", () => {
    const agg = aggregateCosts({
      months: meses,
      groups: grupos,
      rows: [fila("Alquiler", "2025-11-05", 100), fila("Alquiler", "2025-12-05", 200)] as any,
    });
    const alquiler = realCostsByGroup(agg).find((r) => r.group === "Alquiler")!;
    expect(alquiler.total).toBe(300);
    expect(alquiler.monthsWithData).toBe(2);
    expect(alquiler.monthlyAverage).toBe(150);
  });

  it("un grupo sin gastos aparece igual, en cero y sin dividir por cero", () => {
    const agg = aggregateCosts({ months: meses, groups: grupos, rows: [] as any });
    const materiales = realCostsByGroup(agg).find((r) => r.group === "Materiales")!;
    expect(materiales.monthsWithData).toBe(0);
    expect(materiales.monthlyAverage).toBe(0);
  });
});
