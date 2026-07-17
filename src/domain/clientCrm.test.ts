import { buildClientCrmRows } from "./clientCrm";
import type { CrmBudgetInput } from "./clientCrm";

const b = (over: Partial<CrmBudgetInput>): CrmBudgetInput => ({
  number: "1000",
  client: "BEA",
  project: "RACK TV",
  date: "2026-06-20",
  status: "borrador",
  revisionNumber: 1,
  finalPrice: 0,
  company: "De raiz s.r.l",
  ...over,
});

const find = (rows: ReturnType<typeof buildClientCrmRows>, client: string) =>
  rows.find((r) => r.client.toUpperCase() === client.toUpperCase())!;

describe("buildClientCrmRows", () => {
  it("una fila por cliente, consolidando varios presupuestos", () => {
    const rows = buildClientCrmRows([
      b({ number: "1", client: "ANA", project: "PUERTAS" }),
      b({ number: "2", client: "ANA", project: "ESCRITORIO" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(find(rows, "ANA").budgetsCount).toBe(2);
  });

  // El nucleo: revisiones del mismo presupuesto NO se cuentan como ventas distintas.
  it("colapsa las revisiones a la ultima y no infla el monto aprobado", () => {
    const rows = buildClientCrmRows([
      b({ number: "P-3405", client: "BEA", status: "borrador", revisionNumber: 1, finalPrice: 28632564 }),
      b({ number: "P-3405", client: "BEA", status: "aprobado", revisionNumber: 2, finalPrice: 5853151 }),
      b({ number: "P-3405", client: "BEA", status: "aprobado", revisionNumber: 3, finalPrice: 5681013 }),
    ]);
    const bea = find(rows, "BEA");
    expect(bea.budgetsCount).toBe(1); // un solo presupuesto, no tres
    expect(bea.approvedCount).toBe(1);
    expect(bea.approvedAmount).toBe(5681013); // la ultima revision, no la suma
  });

  it("suma el monto aprobado de presupuestos DISTINTOS del mismo cliente", () => {
    const rows = buildClientCrmRows([
      b({ number: "10", client: "CONTRACT RENT", status: "aprobado", revisionNumber: 1, finalPrice: 4000000 }),
      b({ number: "11", client: "CONTRACT RENT", status: "aprobado", revisionNumber: 1, finalPrice: 7907774 }),
      b({ number: "12", client: "CONTRACT RENT", status: "borrador", revisionNumber: 1, finalPrice: 999 }),
    ]);
    const c = find(rows, "CONTRACT RENT");
    expect(c.budgetsCount).toBe(3);
    expect(c.approvedCount).toBe(2);
    expect(c.approvedAmount).toBe(11907774);
  });

  it("agrupa el cliente sin importar mayusculas ni espacios, y muestra el nombre mas reciente", () => {
    const rows = buildClientCrmRows([
      b({ number: "1", client: "bea ", date: "2026-01-01" }),
      b({ number: "2", client: "BEA", date: "2026-06-20" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].client).toBe("BEA"); // el del presupuesto mas nuevo
  });

  it("un presupuesto en borrador deja el monto aprobado en cero", () => {
    const rows = buildClientCrmRows([b({ client: "FLOR", status: "borrador", finalPrice: 2829123 })]);
    expect(find(rows, "FLOR")).toMatchObject({ approvedCount: 0, approvedAmount: 0 });
  });

  it("deriva la etapa: Ganado si hay algun aprobado", () => {
    const rows = buildClientCrmRows([
      b({ number: "1", client: "X", status: "borrador" }),
      b({ number: "2", client: "X", status: "aprobado", finalPrice: 100 }),
    ]);
    expect(find(rows, "X").stage).toBe("Ganado");
  });

  it("deriva la etapa: Perdido si todos son no_aprobado", () => {
    const rows = buildClientCrmRows([b({ client: "Y", status: "no_aprobado" })]);
    expect(find(rows, "Y").stage).toBe("Perdido");
  });

  it("deriva la etapa: En presupuesto si hay borradores sin aprobar", () => {
    const rows = buildClientCrmRows([b({ client: "Z", status: "borrador" })]);
    expect(find(rows, "Z").stage).toBe("En presupuesto");
  });

  it("junta los proyectos distintos, del mas nuevo al mas viejo", () => {
    const rows = buildClientCrmRows([
      b({ number: "1", client: "V", project: "ESCRITORIO", date: "2026-01-01" }),
      b({ number: "2", client: "V", project: "REVESTIMIENTO", date: "2026-06-22" }),
      b({ number: "3", client: "V", project: "ESCRITORIO", date: "2026-05-01" }),
    ]);
    expect(find(rows, "V").projects).toEqual(["REVESTIMIENTO", "ESCRITORIO"]);
  });

  it("ordena por monto aprobado descendente", () => {
    const rows = buildClientCrmRows([
      b({ number: "1", client: "CHICO", status: "aprobado", finalPrice: 100 }),
      b({ number: "2", client: "GRANDE", status: "aprobado", finalPrice: 9999 }),
    ]);
    expect(rows.map((r) => r.client)).toEqual(["GRANDE", "CHICO"]);
  });

  it("toma la ultima revision aunque venga en orden desordenado en el array", () => {
    const rows = buildClientCrmRows([
      b({ number: "1", client: "W", status: "aprobado", revisionNumber: 3, finalPrice: 500 }),
      b({ number: "1", client: "W", status: "borrador", revisionNumber: 1, finalPrice: 999 }),
      b({ number: "1", client: "W", status: "aprobado", revisionNumber: 2, finalPrice: 700 }),
    ]);
    const w = find(rows, "W");
    expect(w.approvedAmount).toBe(500); // revision 3
    expect(w.budgetsCount).toBe(1);
  });

  it("ignora presupuestos sin numero o sin cliente", () => {
    const rows = buildClientCrmRows([
      b({ number: "", client: "SIN NUMERO" }),
      b({ number: "9", client: "  " }),
      b({ number: "10", client: "OK" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].client).toBe("OK");
  });

  it("registra las empresas del cliente (puede estar en las dos)", () => {
    const rows = buildClientCrmRows([
      b({ number: "1", client: "MULTI", company: "BGA estudio de diseño y produccion industrial s.r.l" }),
      b({ number: "2", client: "MULTI", company: "De raiz s.r.l" }),
    ]);
    expect(find(rows, "MULTI").companies).toHaveLength(2);
  });

  // Caso real: la misma venta cargada en las dos empresas no se cuenta dos veces.
  it("el mismo presupuesto del mismo cliente en ambas empresas cuenta una sola vez", () => {
    const rows = buildClientCrmRows([
      b({ number: "3400", client: "DAMIAN", status: "aprobado", revisionNumber: 2, finalPrice: 2674423, company: "BGA estudio de diseño y produccion industrial s.r.l" }),
      b({ number: "3400", client: "DAMIAN", status: "aprobado", revisionNumber: 1, finalPrice: 2674423, company: "De raiz s.r.l" }),
    ]);
    const d = find(rows, "DAMIAN");
    expect(d.budgetsCount).toBe(1);
    expect(d.approvedCount).toBe(1);
    expect(d.approvedAmount).toBe(2674423); // no 5.348.846
  });

  it("dos clientes distintos que comparten numero NO se fusionan", () => {
    const rows = buildClientCrmRows([
      b({ number: "3400", client: "UNO", status: "aprobado", finalPrice: 100, company: "BGA estudio de diseño y produccion industrial s.r.l" }),
      b({ number: "3400", client: "DOS", status: "aprobado", finalPrice: 200, company: "De raiz s.r.l" }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it("sin presupuestos devuelve lista vacia", () => {
    expect(buildClientCrmRows([])).toEqual([]);
  });
});
