import { gastosPorGrupo, mismaPersona, porTipoDeCaja, posicionCajaChica, responsablesDe, resumenCaja } from "./cajaChicaFicha";

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

// DESBALANCE B/N: la caja es una bolsa (manda el bruto), pero con plata negra se puede comprar con
// factura y al reves. Caso: entro todo en NEGRO y se compro con factura.
describe("desbalance blanco/negro de la caja", () => {
  it("plata negra gastada con factura = N→B", () => {
    const r = resumenCaja(fondo(1, { assignedWhite: 0, assignedBlack: 1000 }), [gasto(1, 1, 300, "blanco"), gasto(2, 1, 200, "negro")]);
    expect(r).toMatchObject({ resta: 500, negroFacturado: 300, blancoSinFactura: 0, desbalanceConocido: true });
  });

  it("plata blanca gastada sin factura = B→N", () => {
    const r = resumenCaja(fondo(1, { assignedWhite: 1000, assignedBlack: 0 }), [gasto(1, 1, 250, "negro")]);
    expect(r).toMatchObject({ negroFacturado: 0, blancoSinFactura: 250 });
  });

  it("dentro de lo que entro por cada circuito no hay desbalance", () => {
    const r = resumenCaja(fondo(1), [gasto(1, 1, 600, "blanco"), gasto(2, 1, 400, "negro")]);
    expect(r).toMatchObject({ resta: 0, negroFacturado: 0, blancoSinFactura: 0 });
  });

  it("caja sin origen blanco/negro cargado: no se puede saber", () => {
    const r = resumenCaja(fondo(1, { assignedWhite: undefined, assignedBlack: undefined }), [gasto(1, 1, 100, "blanco")]);
    expect(r.desbalanceConocido).toBe(false);
  });
});

describe("contador B/N de caja chica (por empresa)", () => {
  it("negro gastado con factura -> las proximas compras van SIN factura", () => {
    const [p] = posicionCajaChica(
      [fondo(1, { assignedWhite: 0, assignedBlack: 686000 })],
      [gasto(1, 1, 7037.05, "blanco")]
    );
    expect(p).toMatchObject({ negroFacturado: 7037.05, neto: 7037.05, recomendacion: "sin_factura" });
  });

  it("se compensa entre cajas: N→B de una con B→N de otra", () => {
    const [p] = posicionCajaChica(
      [fondo(1, { assignedWhite: 0, assignedBlack: 1000, closed: true }), fondo(2, { assignedWhite: 1000, assignedBlack: 0 })],
      [gasto(1, 1, 300, "blanco"), gasto(2, 2, 300, "negro")]
    );
    expect(p).toMatchObject({ neto: 0, recomendacion: "nivelado" });
  });

  it("blanco gastado sin factura -> las proximas van CON factura; cajas sin origen aparte", () => {
    const [p] = posicionCajaChica(
      [fondo(1, { assignedWhite: 1000, assignedBlack: 0 }), fondo(2, { assignedWhite: undefined, assignedBlack: undefined })],
      [gasto(1, 1, 400, "negro")]
    );
    expect(p).toMatchObject({ neto: -400, recomendacion: "con_factura", cajasSinOrigen: 1, montoSinOrigen: 1000 });
  });
});
