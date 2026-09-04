import { crecimientoInversion, resumenInversionesPorEmpresa } from "./inversiones";
import type { Inversion } from "./types";

const inv = (over: Partial<Inversion>): Inversion => ({
  id: 1,
  company: "BGA",
  tipo: "Plazo fijo",
  descripcion: "",
  moneda: "ARS",
  montoInvertido: 0,
  valorActual: 0,
  fechaInicio: "",
  fechaFin: "",
  estado: "activa",
  notas: "",
  ...over,
});

describe("crecimientoInversion", () => {
  it("calcula ganancia y porcentaje", () => {
    expect(crecimientoInversion({ montoInvertido: 100, valorActual: 130 })).toEqual({
      ganancia: 30,
      pct: 30,
    });
  });
  it("pérdida da negativo", () => {
    expect(crecimientoInversion({ montoInvertido: 100, valorActual: 80 })).toEqual({
      ganancia: -20,
      pct: -20,
    });
  });
  it("capital 0 no divide por cero", () => {
    expect(crecimientoInversion({ montoInvertido: 0, valorActual: 50 })).toEqual({
      ganancia: 50,
      pct: 0,
    });
  });
});

describe("resumenInversionesPorEmpresa", () => {
  const inversiones: Inversion[] = [
    inv({ id: 1, company: "BGA", moneda: "ARS", montoInvertido: 100, valorActual: 130 }),
    inv({ id: 2, company: "BGA", moneda: "ARS", montoInvertido: 200, valorActual: 220 }),
    inv({ id: 3, company: "BGA", moneda: "USD", montoInvertido: 1000, valorActual: 1100 }),
    inv({ id: 4, company: "BGA", moneda: "USD", montoInvertido: 500, valorActual: 400, estado: "cerrada" }), // no cuenta
    inv({ id: 5, company: "De raiz s.r.l", moneda: "ARS", montoInvertido: 50, valorActual: 60 }),
  ];

  it("separa ARS de USD y no suma monedas distintas", () => {
    const r = resumenInversionesPorEmpresa(inversiones, ["BGA", "De raiz s.r.l"]);
    const bga = r.find((x) => x.company === "BGA")!;
    expect(bga.activas).toBe(3); // la cerrada no cuenta
    expect(bga.ars).toMatchObject({ invertido: 300, valorActual: 350, ganancia: 50, cantidad: 2 });
    expect(bga.usd).toMatchObject({ invertido: 1000, valorActual: 1100, ganancia: 100, cantidad: 1 });
    // % ARS = 50/300 ≈ 16.67
    expect(bga.ars.pct).toBeCloseTo(16.6667, 3);
    expect(bga.usd.pct).toBeCloseTo(10, 5);
  });

  it("empresa sin inversiones da todo en cero", () => {
    const r = resumenInversionesPorEmpresa(inversiones, ["Otra"]);
    expect(r[0].activas).toBe(0);
    expect(r[0].ars).toMatchObject({ invertido: 0, valorActual: 0, ganancia: 0, cantidad: 0 });
  });
});
