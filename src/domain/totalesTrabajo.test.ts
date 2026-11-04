import { totalesAdicionales, totalesCobranzas, totalesComisiones, totalesFacturas, totalesRetenciones } from "./totalesTrabajo";

describe("totales de cada bloque de un trabajo", () => {
  it("facturas: neto, IVA y total (las vacias no cuentan)", () => {
    expect(
      totalesFacturas([
        { subtotal: 100000, vat: 21000, total: 121000 },
        { subtotal: 50000, vat: 10500, total: 60500 },
        { subtotal: 0, vat: 0, total: 0 },
      ])
    ).toEqual({ cantidad: 2, neto: 150000, iva: 31500, total: 181500 });
  });

  it("cobranzas: blanco con su neto, negro, y los dolares aparte (un U$S pesificado va en pesos)", () => {
    const t = totalesCobranzas([
      { amount: 121000 },
      { amount: 50000, administration: "negro" },
      { amount: 100, currency: "USD", administration: "negro" },
      { amount: 10, currency: "USD", administration: "negro", arsApplied: true, exchangeRate: 1000 },
    ]);
    expect(t).toEqual({ cantidad: 4, blanco: 121000, netoBlanco: 100000, ivaBlanco: 21000, negro: 60000, total: 181000, neto: 160000, usd: 100 });
  });

  it("retenciones y comisiones: cuantas y cuanto", () => {
    expect(totalesRetenciones([{ amount: 1500 }, { amount: 2500 }, { amount: 0 }])).toEqual({ cantidad: 2, total: 4000 });
    expect(totalesComisiones([{ amount: 1000 }, { amount: 500, administration: "negro" }])).toEqual({ cantidad: 2, blanco: 1000, negro: 500, total: 1500 });
  });

  it("adicionales: el blanco discrimina IVA (con su alicuota), el negro no, U$S aparte", () => {
    expect(
      totalesAdicionales([
        { amount: 10000 },
        { amount: 10000, vatRate: 10.5 },
        { amount: 5000, administration: "negro" },
        { amount: 200, currency: "USD" },
      ])
    ).toEqual({ cantidad: 4, netoBlanco: 20000, iva: 3150, totalBlanco: 23150, negro: 5000, neto: 25000, total: 28150, usdBlanco: 200, usdNegro: 0 });
  });
});
