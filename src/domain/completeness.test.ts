import {
  purchaseInvoiceMissing,
  purchaseInvoiceComplete,
  jobPaymentMissing,
  jobPaymentComplete,
} from "./completeness";

describe("purchaseInvoiceMissing", () => {
  it("factura vacía => falta todo", () => {
    expect(purchaseInvoiceMissing({})).toEqual(["proveedor", "CUIT", "fecha", "monto"]);
  });
  it("factura completa => sin faltantes", () => {
    expect(
      purchaseInvoiceComplete({
        supplier: "DAC",
        taxId: "30535803710",
        invoiceDate: "2026-07-14",
        total: 141762.78,
      })
    ).toBe(true);
  });
  it("sin CUIT y sin monto => los marca", () => {
    expect(purchaseInvoiceMissing({ supplier: "X", invoiceDate: "2026-07-01", total: 0 })).toEqual([
      "CUIT",
      "monto",
    ]);
  });
});

describe("jobPaymentMissing", () => {
  it("pago sin monto ni fecha => falta ambos", () => {
    expect(jobPaymentMissing({})).toEqual(["monto", "fecha"]);
  });
  it("pago ARS con monto y fecha => completo", () => {
    expect(jobPaymentComplete({ amount: 500000, paymentDate: "2026-07-03" })).toBe(true);
  });
  it("USD pesificado sin cotización => falta cotización", () => {
    expect(
      jobPaymentMissing({ amount: 660, paymentDate: "2026-07-03", currency: "USD", arsApplied: true })
    ).toContain("cotización");
  });
  it("USD pesificado con cotización => completo", () => {
    expect(
      jobPaymentComplete({
        amount: 660,
        paymentDate: "2026-07-03",
        currency: "USD",
        arsApplied: true,
        exchangeRate: 1380,
      })
    ).toBe(true);
  });
  it("USD puro (no pesificado) no exige cotización", () => {
    expect(jobPaymentComplete({ amount: 660, paymentDate: "2026-07-03", currency: "USD" })).toBe(true);
  });
});
