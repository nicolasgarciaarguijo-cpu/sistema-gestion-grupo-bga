import { computeSupplierAccounts, type SupplierInvoice } from "./supplierAccounts";

const inv = (over: Partial<SupplierInvoice>): SupplierInvoice => ({
  id: Math.floor(Math.random() * 1e6),
  company: "BGA",
  supplier: "Herrajes Magliola",
  taxId: "30663891142",
  invoiceNumber: "A-1",
  invoiceDate: "2026-07-01",
  total: 0,
  paidByCostEntryId: null,
  ...over,
});

describe("computeSupplierAccounts", () => {
  it("agrupa por proveedor y separa deuda (sin pago) de pagado (con pago vinculado)", () => {
    const { accounts, deudaTotal } = computeSupplierAccounts([
      inv({ total: 100000, paidByCostEntryId: null }),
      inv({ total: 50000, paidByCostEntryId: 999 }), // pagada
      inv({ total: 30000, paidByCostEntryId: null }),
    ]);
    const magliola = accounts.find((a) => a.taxId === "30663891142")!;
    expect(magliola.facturado).toBe(180000);
    expect(magliola.pagado).toBe(50000);
    expect(magliola.deuda).toBe(130000);
    expect(magliola.pendientes.length).toBe(2);
    expect(deudaTotal).toBe(130000);
  });

  it("dos proveedores distintos no se mezclan", () => {
    const { accounts } = computeSupplierAccounts([
      inv({ taxId: "111", supplier: "A", total: 100 }),
      inv({ taxId: "222", supplier: "B", total: 200 }),
    ]);
    expect(accounts.length).toBe(2);
    expect(accounts.find((a) => a.taxId === "111")!.deuda).toBe(100);
    expect(accounts.find((a) => a.taxId === "222")!.deuda).toBe(200);
  });

  it("respeta el scope de empresa", () => {
    const { deudaTotal } = computeSupplierAccounts(
      [
        inv({ company: "BGA", total: 100 }),
        inv({ company: "De raiz s.r.l", total: 70 }),
      ],
      "De raiz s.r.l"
    );
    expect(deudaTotal).toBe(70);
  });

  it("ordena primero el proveedor con mas deuda", () => {
    const { accounts } = computeSupplierAccounts([
      inv({ taxId: "111", supplier: "Chico", total: 100 }),
      inv({ taxId: "222", supplier: "Grande", total: 900 }),
    ]);
    expect(accounts[0].supplier).toBe("Grande");
  });
});
