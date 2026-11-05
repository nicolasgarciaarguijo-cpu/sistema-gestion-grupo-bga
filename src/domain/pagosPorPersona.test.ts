import { pagosCruzadosEntreEmpresas } from "./pagosPorPersona";

it("pago cruzado: factura de una empresa pagada por la otra", () => {
  const r = pagosCruzadosEntreEmpresas(
    [
      { id: 1, company: "De raiz s.r.l", supplier: "DAC", receiptLetter: "A", invoiceNumber: "10", paidByCostEntryId: 11 },
      { id: 2, company: "BGA", paidByCostEntryId: 12 },
      { id: 3, company: "BGA", paidByCostEntryId: null },
    ],
    [
      { id: 11, company: "BGA", date: "2026-10-01", amount: 500 },
      { id: 12, company: "BGA", date: "2026-10-02", amount: 700 },
    ]
  );
  expect(r).toEqual([{ facturaId: 1, pagoId: 11, empresaFactura: "De raiz s.r.l", empresaPaga: "BGA", date: "2026-10-01", amount: 500, detalle: "DAC · A 10" }]);
});
