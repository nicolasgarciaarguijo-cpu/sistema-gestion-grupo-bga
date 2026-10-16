import { pagosSinFactura, resumenPagosSinFactura } from "./pagosACuenta";

const DR = "De raiz s.r.l";
const pago = (id: number, extra: any = {}) => ({ id, company: DR, date: "2026-10-01", amount: 1000, supplier: "DAC Maderas", aCuenta: true, ...extra });

describe("pagos a cuenta sin factura", () => {
  it("un pago a cuenta sin factura vinculada queda pendiente, con los dias que pasaron", () => {
    const [p] = pagosSinFactura([pago(1)], [], "2026-10-16");
    expect(p).toMatchObject({ id: 1, amount: 1000, supplier: "DAC Maderas", dias: 15, administration: "blanco" });
  });

  it("cuando llega la factura y se le vincula el pago, deja de estar pendiente", () => {
    expect(pagosSinFactura([pago(1)], [{ paidByCostEntryId: 1 }], "2026-10-16")).toHaveLength(0);
  });

  it("resuelto con comprobante o con un responsable que asume la falta: deja de estar pendiente", () => {
    const res = { tipo: "responsable", firmante: "Gustavo", detalle: "el proveedor no factura", fecha: "2026-10-16" };
    expect(pagosSinFactura([pago(1, { resolucionSinFactura: res })], [], "2026-10-16")).toHaveLength(0);
  });

  it("un pago comun (no a cuenta) no avisa", () => {
    expect(pagosSinFactura([pago(1, { aCuenta: false })], [], "2026-10-16")).toHaveLength(0);
  });

  it("resumen por empresa: cantidad, total y el mas viejo", () => {
    const pend = pagosSinFactura([pago(1, { date: "2026-09-01" }), pago(2, { amount: 500 }), pago(3, { company: "BGA" })], [], "2026-10-16");
    expect(resumenPagosSinFactura(pend, DR)).toEqual({ cantidad: 2, total: 1500, masViejo: 45 });
    expect(resumenPagosSinFactura(pend)).toMatchObject({ cantidad: 3, total: 2500 });
  });
});
