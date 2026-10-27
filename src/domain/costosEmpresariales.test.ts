import {
  costosEmpresariales,
  elegirImpacto,
  fijarValor,
  marcadoresParaPresupuesto,
  ultimosMesesCerrados,
  volverAlSugerido,
} from "./costosEmpresariales";
import type { CostSourceRow } from "./costs";
import type { CostGroup, FixedMarker } from "./types";

const grupo = (id: number, name: string, kind: "fijo" | "variable", auto = false): CostGroup => ({
  id, name, kind, company: "General", active: true, auto, notes: "",
});
const groups: CostGroup[] = [
  grupo(1, "Edilicios", "fijo"),
  grupo(2, "Personal", "fijo", true),
  grupo(3, "Compras", "variable"),
];
const fila = (company: "BGA" | "De Raiz", date: string, group: string, amount: number): CostSourceRow =>
  ({ company, date, group, amount, administration: "blanco", origin: "pago" } as unknown as CostSourceRow);

const BGA = "BGA" as any;
const DR = "De Raiz" as any;
const rows: CostSourceRow[] = [
  fila("BGA", "2026-07-10", "Edilicios", 300),
  fila("BGA", "2026-08-10", "Edilicios", 300),
  fila("BGA", "2026-09-10", "Edilicios", 600),
  fila("BGA", "2026-10-02", "Edilicios", 9999), // mes en curso: no entra
  fila("BGA", "2026-06-10", "Edilicios", 9999), // fuera de los 3 meses
  fila("De Raiz", "2026-08-10", "Edilicios", 900), // otra empresa
  fila("BGA", "2026-09-10", "Personal", 3000),
  fila("BGA", "2026-09-10", "Compras", 1500),
];
const base = (marcadores: FixedMarker[] = [], company = BGA) =>
  costosEmpresariales({ hoy: "2026-10-27", company, groups, rows, marcadores });
const de = (lista: ReturnType<typeof base>, g: string) => lista.find((c) => c.group === g)!;
let id = 100;
const nuevoId = () => ++id;

describe("costos empresariales", () => {
  test("los ultimos 3 meses cerrados, sin el mes en curso", () => {
    expect(ultimosMesesCerrados("2026-10-27")).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(ultimosMesesCerrados("2026-02-03")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  test("promedio de 3 meses por empresa, sin mezclar la otra", () => {
    const ed = de(base(), "Edilicios");
    expect(ed.porMes).toEqual([300, 300, 600]);
    expect(ed.promedio).toBe(400);
    expect(ed.valorManual).toBeNull();
    expect(ed.valorAUsar).toBe(400);
    expect(de(base([], DR), "Edilicios").promedio).toBe(300);
  });

  test("por defecto impactan los fijos cargados a mano; variables y automaticos no", () => {
    const c = base();
    expect(de(c, "Edilicios").impacta).toBe("empresa");
    expect(de(c, "Personal").impacta).toBe("ninguna");
    expect(de(c, "Compras").impacta).toBe("ninguna");
  });

  test("el valor escrito a mano manda y se puede volver al promedio", () => {
    let m = fijarValor([], de(base(), "Edilicios"), 500, nuevoId, "");
    expect(de(base(m), "Edilicios").valorAUsar).toBe(500);
    m = volverAlSugerido(m, de(base(m), "Edilicios"));
    const ed = de(base(m), "Edilicios");
    expect(ed.valorManual).toBeNull();
    expect(ed.valorAUsar).toBe(400);
  });

  test("con varios marcadores el valor se reparte en proporcion", () => {
    const m: FixedMarker[] = [
      { id: 1, company: BGA, workType: "General", group: "Edilicios", description: "Alquiler", amount: 300, active: true, notes: "" },
      { id: 2, company: BGA, workType: "General", group: "Edilicios", description: "Expensas", amount: 100, active: true, notes: "" },
    ];
    const r = fijarValor(m, de(base(m), "Edilicios"), 800, nuevoId, "");
    expect(r.map((x) => x.amount)).toEqual([600, 200]);
  });

  test("al presupuesto entra lo de su empresa y lo de la otra marcado 'las dos'", () => {
    let m: FixedMarker[] = [];
    const todas = () => [...base(m, BGA), ...base(m, DR)];
    const presupuesto = (empresa: any) => marcadoresParaPresupuesto({ empresa, workType: "General" as any, costos: todas(), marcadores: m });

    expect(presupuesto(BGA).map((x) => [x.group, x.amount])).toEqual([["Edilicios", 400]]);
    expect(presupuesto(DR).map((x) => [x.company, x.amount])).toEqual([[DR, 300]]);

    m = elegirImpacto(m, de(base(m), "Edilicios"), "ambas", nuevoId);
    expect(presupuesto(DR).map((x) => [x.company, x.amount])).toEqual([[BGA, 400], [DR, 300]]);

    m = elegirImpacto(m, de(base(m), "Edilicios"), "ninguna", nuevoId);
    expect(presupuesto(BGA)).toEqual([]);
  });

  test("un marcador suelto (grupo que no esta en Costos) solo entra en su empresa", () => {
    const m: FixedMarker[] = [
      { id: 9, company: DR, workType: "General", group: "Otro", description: "x", amount: 50, active: true, notes: "" },
    ];
    const costos = [...base(m, BGA), ...base(m, DR)];
    expect(marcadoresParaPresupuesto({ empresa: BGA, workType: "General" as any, costos, marcadores: m }).some((x) => x.id === 9)).toBe(false);
    expect(marcadoresParaPresupuesto({ empresa: DR, workType: "General" as any, costos, marcadores: m }).some((x) => x.id === 9)).toBe(true);
  });
});
