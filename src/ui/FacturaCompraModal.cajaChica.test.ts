import { conPagoAlTotal, type FacturaForm } from "./FacturaCompraModal";

const base = {
  company: "DR", supplier: "", taxId: "", altaProveedor: false, receiptKind: "Factura", receiptLetter: "X", invoiceNumber: "",
  invoiceDate: "2026-11-12", net21: 0, vatRate: 0, exemptAmount: 0, vat: 0, otrosImpuestos: 0, iibb: 0, total: 5000,
  administration: "negro", notes: "", saldo: { estadoPrevisto: "programado" },
} as unknown as FacturaForm;
const pago = { key: "a", fecha: "2026-11-12", monto: 0, metodo: "efectivo" as const, administration: "negro" as const, cuentaId: "persona|DR|lucas|negro" };

describe("rendir gasto de caja chica con la ficha de Compras", () => {
  it("el unico pago de la caja sigue al total", () => {
    expect(conPagoAlTotal({ ...base, pagoSigueTotal: true, pagos: [pago] }).pagos[0].monto).toBe(5000);
  });
  it("si el pago se toco a mano o ya estaba cargado, no se mueve", () => {
    expect(conPagoAlTotal({ ...base, pagoSigueTotal: false, pagos: [pago] }).pagos[0].monto).toBe(0);
    expect(conPagoAlTotal({ ...base, pagoSigueTotal: true, pagos: [{ ...pago, costEntryId: 9 }] }).pagos[0].monto).toBe(0);
  });
});
