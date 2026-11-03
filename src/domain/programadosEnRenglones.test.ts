import { programadosEnRenglones } from "./programadosEnRenglones";

const base = { company: "De Raíz", fechaLimite: "2026-11-10", monto: 1000, currency: "ARS" as const, estado: "proximo" };

describe("programadosEnRenglones", () => {
  it("la factura de un proveedor va a la fila de ese proveedor, en su grupo", () => {
    const r = programadosEnRenglones([{ ...base, origen: "factura", refId: 7, titulo: "Factura DAC" }], (id) =>
      id === 7 ? { conceptKey: "prov:proveedores_out:variable|Compras y materiales", titulo: "DAC" } : null
    );
    expect(r).toEqual([
      expect.objectContaining({ conceptKey: "prov:proveedores_out:variable|Compras y materiales", titulo: "DAC", amount: 1000, estado: "proximo" }),
    ]);
  });
  it("la tarjeta y el credito van a Financieros; un plan de IVA a Impuestos", () => {
    const r = programadosEnRenglones(
      [
        { ...base, origen: "tarjeta", refId: 1, titulo: "Tarjeta Visa" },
        { ...base, origen: "deuda", refId: 2, titulo: "Crédito Santander" },
        { ...base, origen: "deuda", refId: 3, titulo: "Plan IVA" },
      ],
      () => null
    );
    expect(r.map((x) => [x.conceptKey, x.titulo])).toEqual([
      ["prov:proveedores_out:fijo|Financieros", "Tarjeta Visa"],
      ["prov:proveedores_out:fijo|Financieros", "Crédito Santander"],
      ["custom:impuestos:Plan IVA", undefined],
    ]);
  });
  it("la cuota de una deuda va a la fila de su pago (grupo de la deuda y acreedor)", () => {
    const r = programadosEnRenglones(
      [{ ...base, origen: "deuda", refId: 9, titulo: "Crédito · Santander" }],
      () => null,
      (id) => (id === 9 ? { conceptKey: "prov:proveedores_out:fijo|Gastos financieros", titulo: "Santander" } : null)
    );
    expect(r.map((x) => [x.conceptKey, x.titulo])).toEqual([["prov:proveedores_out:fijo|Gastos financieros", "Santander"]]);
  });

  it("lo pagado, en dolares, sin monto o de otro carril no se repite", () => {
    const r = programadosEnRenglones(
      [
        { ...base, origen: "tarjeta", refId: 1, titulo: "T", estado: "pagado" },
        { ...base, origen: "tarjeta", refId: 1, titulo: "T", currency: "USD" },
        { ...base, origen: "tarjeta", refId: 1, titulo: "T", monto: 0 },
        { ...base, origen: "seguro", refId: 1, titulo: "Seguro" },
        { ...base, origen: "manual", refId: 1, titulo: "Algo" },
        { ...base, origen: "sueldos", refId: 1, titulo: "Juan" },
      ],
      () => null
    );
    expect(r).toEqual([]);
  });
});

describe("haberes por pagar en el cash flow (03/11/2026)", () => {
  const { programadosEnRenglones } = require("./programadosEnRenglones");
  it("el sueldo que falta pagar va al renglón de la persona en HABERES", () => {
    const items = [{ origen: "sueldos", refId: "haber:7:2026-10", company: "De raiz s.r.l", titulo: "Haber de Lucas", fechaLimite: "2026-11-06", monto: 500000, currency: "ARS", estado: "proximo" }];
    const r = programadosEnRenglones(items, () => null, () => null, (refId: string) => (refId === "haber:7:2026-10" ? { conceptKey: "custom:haberes:LUCAS" } : null));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ conceptKey: "custom:haberes:LUCAS", date: "2026-11-06", amount: 500000 });
    expect(programadosEnRenglones(items, () => null, () => null)).toHaveLength(0);
  });
});
