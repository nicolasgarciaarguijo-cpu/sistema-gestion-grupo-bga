import { creditoAplicadoPorFactura, esNotaDeCredito, saldoDeFactura } from "./notasCredito";
import { computeSupplierLedgers } from "./purchaseLedger";

const DR = "De raiz s.r.l";
const factura = (id: number, total: number, extra: any = {}) => ({
  id, company: DR, supplier: "DAC Maderas", taxId: "30-11111111-1", invoiceNumber: String(id), invoiceDate: "2026-10-01",
  total, administration: "blanco" as const, origin: "compras" as const, ...extra,
});
const nc = (id: number, total: number, extra: any = {}) => ({
  id, company: DR, supplier: "DAC Maderas", taxId: "30-11111111-1", number: `NC${id}`, date: "2026-10-05", total, administration: "blanco" as const, ...extra,
});

describe("notas de credito", () => {
  it("reconoce los tipos de ARCA", () => {
    expect(esNotaDeCredito("3 - Nota de Crédito A")).toBe(true);
    expect(esNotaDeCredito("8 - Nota de Credito B")).toBe(true);
    expect(esNotaDeCredito("1 - Factura A")).toBe(false);
  });

  it("credito aplicado por factura y lo que queda por pagar", () => {
    const m = creditoAplicadoPorFactura([{ facturaId: 1, total: 300 }, { facturaId: 1, total: 200 }, { facturaId: null, total: 999 }]);
    expect(m.get(1)).toBe(500);
    expect(saldoDeFactura(1000, 500)).toBe(500);
    expect(saldoDeFactura(400, 500)).toBe(0);
  });

  it("en la cuenta corriente baja lo que le debemos (sin mover plata)", () => {
    const { ledgers } = computeSupplierLedgers({ invoices: [factura(1, 1000)], payments: [], creditNotes: [nc(9, 300)] });
    expect(ledgers[0]).toMatchObject({ comprado: 1000, notasCredito: 300, pagado: 0, saldo: 700 });
    expect(ledgers[0].movimientos.map((m) => m.type)).toEqual(["compra", "nota_credito"]);
  });

  it("aplicada a una factura impaga, la factura debe solo la diferencia (y si la cubre, ya no figura sin pago)", () => {
    const parcial = computeSupplierLedgers({ invoices: [factura(1, 1000)], payments: [], creditNotes: [nc(9, 300, { facturaId: 1 })] });
    expect(parcial.ledgers[0]).toMatchObject({ deudaSinConciliar: 700, facturasSinPago: 1 });
    const total = computeSupplierLedgers({ invoices: [factura(1, 1000)], payments: [], creditNotes: [nc(9, 1000, { facturaId: 1 })] });
    expect(total.ledgers[0]).toMatchObject({ deudaSinConciliar: 0, facturasSinPago: 0, saldo: 0 });
  });

  it("si la factura ya estaba pagada, el proveedor queda a favor", () => {
    const { ledgers } = computeSupplierLedgers({
      invoices: [factura(1, 1000, { paidByCostEntryId: 5 })],
      payments: [{ id: 5, kind: "gasto", company: DR, supplier: "DAC Maderas", taxId: "30-11111111-1", date: "2026-10-02", amount: 1000, administration: "blanco", description: "Pago" }],
      creditNotes: [nc(9, 250, { facturaId: 1 })],
    });
    expect(ledgers[0].saldo).toBe(-250);
  });
});
