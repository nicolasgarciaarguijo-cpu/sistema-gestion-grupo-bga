import { armarPreCierre } from "./preCierre";

describe("pre-cierre: que pasa al ejercicio nuevo", () => {
  it("junta cobros, pagos, cuentas y cajas, con sus totales", () => {
    const p = armarPreCierre({
      cobros: [
        { id: "t1", titulo: "3199 · Granillo", blanco: 1000, negro: 500 },
        { id: "t2", titulo: "3200 · Cobrado", blanco: 0, negro: 0 },
        { id: "t3", titulo: "3201 · Grande", blanco: 5000, negro: 0 },
      ],
      pagos: [
        { id: "p1", origen: "Factura", titulo: "DAC", fecha: "2026-11-10", monto: 300, vencido: false },
        { id: "p2", origen: "Tarjeta", titulo: "Visa", fecha: "2026-10-05", monto: 200, vencido: true },
        { id: "p3", origen: "Tarjeta", titulo: "Visa U$S", fecha: "2026-11-02", monto: 50, vencido: false, currency: "USD" },
      ],
      cuentas: [
        { id: "c1", tipo: "proveedor", nombre: "DAC", saldo: 700 },
        { id: "c2", tipo: "proveedor", nombre: "Barsi", saldo: -100 },
        { id: "c3", tipo: "proveedor", nombre: "Al dia", saldo: 0.5 },
      ],
      cajas: [{ id: "f1", responsable: "Lucas", resta: 678962.95 }],
      archivo: [{ nombre: "Gastos", archivar: 40, quedan: 2 }, { nombre: "Trabajos", archivar: 5, quedan: 3 }],
    });
    expect(p.cobros.map((c) => c.id)).toEqual(["t3", "t1"]);
    expect(p.pagos.map((x) => x.id)).toEqual(["p2", "p3", "p1"]);
    expect(p.cuentas.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(p.totales).toMatchObject({
      aCobrarBlanco: 6000,
      aCobrarNegro: 500,
      aPagar: 500,
      aPagarUsd: 50,
      vencido: 200,
      debemosProveedores: 700,
      aFavorProveedores: 100,
      enCajas: 678962.95,
      seGuarda: 45,
      sigue: 5,
    });
  });
});
