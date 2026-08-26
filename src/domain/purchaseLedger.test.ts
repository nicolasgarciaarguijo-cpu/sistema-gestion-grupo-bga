import {
  computeSupplierLedgers,
  computePersonDebts,
  supplierKey,
  type LedgerInvoice,
  type LedgerPayment,
} from "./purchaseLedger";

const inv = (over: Partial<LedgerInvoice> = {}): LedgerInvoice => ({
  id: 1,
  company: "BGA",
  supplier: "DAC MADERAS",
  taxId: "30-11111111-1",
  invoiceNumber: "A 0001-00000001",
  invoiceDate: "2026-08-01",
  total: 100000,
  administration: "blanco",
  origin: "compras",
  ...over,
});

const pay = (over: Partial<LedgerPayment> = {}): LedgerPayment => ({
  id: 900,
  kind: "gasto",
  company: "BGA",
  supplier: "DAC MADERAS",
  taxId: "30-11111111-1",
  date: "2026-08-10",
  amount: 40000,
  administration: "blanco",
  description: "Transferencia",
  ...over,
});

describe("supplierKey", () => {
  it("el CUIT manda sobre el nombre", () => {
    expect(supplierKey("DAC MADERAS", "30-11111111-1")).toBe("30111111111");
    // El mismo CUIT escrito distinto y con otro nombre es el MISMO proveedor.
    expect(supplierKey("Dac Maderas S.A.", "30111111111")).toBe("30111111111");
  });

  it("sin CUIT cae al nombre normalizado", () => {
    expect(supplierKey("Ferretería  El Águila", "")).toBe("ferreteria el aguila");
    expect(supplierKey("", "")).toBe("sin-proveedor");
  });
});

describe("computeSupplierLedgers", () => {
  it("la factura suma y el pago descuenta, con saldo corriente", () => {
    const { ledgers } = computeSupplierLedgers({
      invoices: [inv({ id: 1, total: 100000 }), inv({ id: 2, total: 50000, invoiceDate: "2026-08-05" })],
      payments: [pay({ id: 900, amount: 40000 })],
    });
    expect(ledgers).toHaveLength(1);
    const l = ledgers[0];
    expect(l.comprado).toBe(150000);
    expect(l.pagado).toBe(40000);
    expect(l.saldo).toBe(110000);
    expect(l.movimientos.map((m) => m.saldo)).toEqual([100000, 150000, 110000]);
  });

  it("a igual fecha primero entra la compra y despues el pago", () => {
    const { ledgers } = computeSupplierLedgers({
      invoices: [inv({ id: 1, total: 100000, invoiceDate: "2026-08-10" })],
      payments: [pay({ id: 900, amount: 100000, date: "2026-08-10" })],
    });
    expect(ledgers[0].movimientos.map((m) => m.type)).toEqual(["compra", "pago"]);
    expect(ledgers[0].movimientos.map((m) => m.saldo)).toEqual([100000, 0]);
  });

  it("un debito del banco que ya se cargo como gasto NO se cuenta dos veces", () => {
    const { ledgers } = computeSupplierLedgers({
      invoices: [inv({ total: 100000 })],
      payments: [
        pay({ id: 900, kind: "gasto", amount: 100000, bankEntryId: 77 }),
        pay({ id: 77, kind: "banco", amount: 100000 }),
      ],
    });
    expect(ledgers[0].pagado).toBe(100000);
    expect(ledgers[0].saldo).toBe(0);
  });

  it("un debito del banco SIN gasto asociado si cuenta como pago", () => {
    const { ledgers } = computeSupplierLedgers({
      invoices: [inv({ total: 100000 })],
      payments: [pay({ id: 77, kind: "banco", amount: 100000, bankEntryId: null })],
    });
    expect(ledgers[0].pagado).toBe(100000);
  });

  it("separa el saldo de la cuenta de la deuda sin conciliar", () => {
    // Se pago todo, pero la factura nunca se ato al pago: la cuenta esta en cero y sin embargo
    // queda una factura sin conciliar. Los dos numeros tienen que salir, no uno solo.
    const { ledgers } = computeSupplierLedgers({
      invoices: [inv({ total: 100000 })],
      payments: [pay({ amount: 100000 })],
    });
    expect(ledgers[0].saldo).toBe(0);
    expect(ledgers[0].deudaSinConciliar).toBe(100000);
    expect(ledgers[0].facturasSinPago).toBe(1);
  });

  it("una factura con pago vinculado no cuenta como sin conciliar", () => {
    const { ledgers } = computeSupplierLedgers({
      invoices: [inv({ total: 100000, paidByCostEntryId: 900 })],
      payments: [pay({ amount: 100000 })],
    });
    expect(ledgers[0].deudaSinConciliar).toBe(0);
    expect(ledgers[0].movimientos[0].conciliada).toBe(true);
  });

  it("los proveedores de convenio van primero, aunque deban menos", () => {
    const { ledgers } = computeSupplierLedgers({
      invoices: [
        inv({ id: 1, supplier: "CONVENIO", taxId: "30-22222222-2", total: 1000 }),
        inv({ id: 2, supplier: "SUELTO", taxId: "30-33333333-3", total: 900000 }),
      ],
      payments: [],
      currentAccountKeys: ["30222222222"],
    });
    expect(ledgers.map((l) => l.supplier)).toEqual(["CONVENIO", "SUELTO"]);
    expect(ledgers[0].esCuentaCorriente).toBe(true);
    expect(ledgers[1].esCuentaCorriente).toBe(false);
  });

  it("el alcance por empresa filtra facturas y pagos", () => {
    const { ledgers, saldoTotal } = computeSupplierLedgers({
      invoices: [inv({ id: 1, company: "BGA", total: 100000 }), inv({ id: 2, company: "De raiz", total: 70000 })],
      payments: [pay({ company: "De raiz", amount: 70000 })],
      companyScope: "BGA",
    });
    expect(ledgers[0].comprado).toBe(100000);
    expect(ledgers[0].pagado).toBe(0);
    expect(saldoTotal).toBe(100000);
  });

  it("el saldo total no compensa: un proveedor a favor no tapa la deuda de otro", () => {
    const { saldoTotal } = computeSupplierLedgers({
      invoices: [inv({ id: 1, supplier: "A", taxId: "30-11111111-1", total: 100000 })],
      // Al proveedor B se le pago de mas (saldo negativo): no debe restar de lo que debemos a A.
      payments: [pay({ id: 901, supplier: "B", taxId: "30-44444444-4", amount: 50000 })],
    });
    expect(saldoTotal).toBe(100000);
  });
});

describe("computePersonDebts", () => {
  it("agrupa por persona lo que puso de su bolsillo y no se le devolvio", () => {
    const { debts, total } = computePersonDebts([
      inv({ id: 1, total: 30000, paidByPerson: "Lucas" }),
      inv({ id: 2, total: 12000, paidByPerson: "lucas" }), // misma persona escrita distinto
      inv({ id: 3, total: 90000, paidByPerson: "Mili" }),
      inv({ id: 4, total: 500000 }), // la pago la empresa
    ]);
    expect(total).toBe(132000);
    expect(debts.map((d) => [d.person, d.total])).toEqual([
      ["Mili", 90000],
      ["Lucas", 42000],
    ]);
  });

  it("una factura ya reintegrada sale de la deuda", () => {
    const { debts, total } = computePersonDebts([
      inv({ id: 1, total: 30000, paidByPerson: "Lucas", reimbursedAt: "2026-08-20" }),
      inv({ id: 2, total: 12000, paidByPerson: "Lucas" }),
    ]);
    expect(total).toBe(12000);
    expect(debts[0].count).toBe(1);
  });

  it("sin nadie que haya puesto plata, no hay deuda", () => {
    expect(computePersonDebts([inv(), inv({ id: 2 })]).total).toBe(0);
  });
});
