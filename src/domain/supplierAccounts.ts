// Cuenta corriente por proveedor (cuentas por pagar): agrupa las facturas de COMPRA por proveedor y
// separa lo que ya tiene un PAGO vinculado de lo que sigue pendiente (= deuda con ese proveedor).
//
// Regla del usuario (2026-08-09): si una factura de compra no está vinculada a un pago, queda abierta
// una cuenta corriente con ese proveedor hasta vincular el pago. Sirve para saber si debemos plata.
// NO toca el estado de resultados (eso lo maneja el PAGO); esto es un tablero de deuda aparte.

export type SupplierInvoice = {
  id: number;
  company: string;
  supplier: string;
  taxId: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  // Pago (CostEntry) vinculado. Ausente/null = sin pago -> deuda pendiente.
  paidByCostEntryId?: number | null;
  // Movimiento del banco (debito) vinculado a esta factura. Vale igual que un pago cargado: es la
  // plata que efectivamente salio, asi que la factura deja de ser deuda.
  paidByBankEntryId?: number | null;
};

export type SupplierAccount = {
  key: string; // taxId o, si no hay, el nombre normalizado
  supplier: string;
  taxId: string;
  facturado: number; // Σ total de todas las facturas del proveedor
  pagado: number; // Σ total de las facturas con pago vinculado
  deuda: number; // Σ total de las facturas SIN pago vinculado
  pendientes: SupplierInvoice[]; // facturas que forman la deuda (sin pago)
  count: number; // cantidad de facturas
};

const isPaid = (inv: SupplierInvoice) => inv.paidByCostEntryId != null || inv.paidByBankEntryId != null;

export function computeSupplierAccounts(
  invoices: SupplierInvoice[],
  companyScope: string = "__ALL__"
): { accounts: SupplierAccount[]; deudaTotal: number; count: number } {
  const inScope = invoices.filter(
    (i) => companyScope === "__ALL__" || i.company === companyScope
  );
  const byKey = new Map<string, SupplierAccount>();
  for (const inv of inScope) {
    const key = (inv.taxId || "").trim() || (inv.supplier || "").trim().toLowerCase() || "sin-proveedor";
    let acc = byKey.get(key);
    if (!acc) {
      acc = {
        key,
        supplier: inv.supplier || "(sin nombre)",
        taxId: inv.taxId || "",
        facturado: 0,
        pagado: 0,
        deuda: 0,
        pendientes: [],
        count: 0,
      };
      byKey.set(key, acc);
    }
    const total = Number(inv.total || 0);
    acc.facturado += total;
    acc.count += 1;
    if (isPaid(inv)) {
      acc.pagado += total;
    } else {
      acc.deuda += total;
      acc.pendientes.push(inv);
    }
    if (!acc.supplier || acc.supplier === "(sin nombre)") acc.supplier = inv.supplier || acc.supplier;
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const accounts = Array.from(byKey.values())
    .map((a) => ({
      ...a,
      facturado: round2(a.facturado),
      pagado: round2(a.pagado),
      deuda: round2(a.deuda),
      pendientes: a.pendientes.sort((x, y) => (x.invoiceDate || "").localeCompare(y.invoiceDate || "")),
    }))
    // Primero los que tienen deuda (más grande arriba); después los saldados.
    .sort((a, b) => b.deuda - a.deuda || a.supplier.localeCompare(b.supplier));
  const deudaTotal = round2(accounts.reduce((s, a) => s + a.deuda, 0));
  const count = accounts.reduce((s, a) => s + a.count, 0);
  return { accounts, deudaTotal, count };
}
