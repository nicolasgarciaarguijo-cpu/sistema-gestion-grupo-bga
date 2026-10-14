import { gastosPorGrupo, mismaPersona, porTipoDeCaja, responsablesDe, resumenCaja } from "./cajaChicaFicha";

const fondo = (id: number, extra: any = {}) => ({
  id,
  company: "De Raiz",
  responsible: "Joaquín",
  assignedAmount: 1000,
  assignedWhite: 600,
  assignedBlack: 400,
  deliveredDate: "2026-10-01",
  closed: false,
  ...extra,
});
const gasto = (id: number, fundId: number, amount: number, administration: "blanco" | "negro", extra: any = {}) => ({
  id,
  fundId,
  date: "2026-10-05",
  amount,
  administration,
  ...extra,
});

describe("caja chica por responsable", () => {
  it("resumen de una caja: utilizado, resta y administracion", () => {
    const r = resumenCaja(fondo(1), [gasto(1, 1, 200, "blanco"), gasto(2, 1, 100, "negro"), gasto(3, 2, 999, "negro")]);
    expect(r).toMatchObject({ asignado: 1000, utilizado: 300, utilizadoBlanco: 200, utilizadoNegro: 100, resta: 700, administracion: "mixta", gastos: 2 });
    expect(resumenCaja(fondo(2, { assignedWhite: 0, assignedBlack: 0 }), []).administracion).toBe("sin clasificar");
    expect(resumenCaja(fondo(2, { assignedWhite: 0 }), []).administracion).toBe("negro");
  });

  it("el mismo responsable escrito distinto es una sola persona", () => {
    expect(mismaPersona("Joaquín ", "joaquin")).toBe(true);
    const rs = responsablesDe([fondo(1), fondo(2, { responsible: "joaquin", closed: true })], [gasto(1, 1, 300, "negro")]);
    expect(rs).toHaveLength(1);
    expect(rs[0]).toMatchObject({ cajas: 2, abiertas: 1, asignado: 2000, utilizado: 300, resta: 1700 });
  });

  it("gastos por grupo de costo, blanco y negro separados", () => {
    const g = gastosPorGrupo([
      gasto(1, 1, 200, "blanco", { costGroup: "Operativos", costGroupKind: "fijo" }),
      gasto(2, 1, 50, "negro", { costGroup: "Operativos", costGroupKind: "fijo" }),
      gasto(3, 1, 10, "negro"),
    ]);
    expect(g[0]).toEqual({ grupo: "Fijo · Operativos", blanco: 200, negro: 50, total: 250, cantidad: 2 });
    expect(g[1].grupo).toBe("Sin grupo");
  });

  it("por tipo de caja, incluyendo los tipos sin cajas", () => {
    const t = porTipoDeCaja([fondo(1, { tipo: "Viáticos" }), fondo(2)], [gasto(1, 1, 100, "negro")], ["General", "Viáticos", "Obra"]);
    expect(t.find((x) => x.tipo === "Viáticos")).toMatchObject({ cajas: 1, utilizado: 100, resta: 900 });
    expect(t.find((x) => x.tipo === "General")).toMatchObject({ cajas: 1 });
    expect(t.find((x) => x.tipo === "Obra")).toMatchObject({ cajas: 0, asignado: 0 });
  });
});
