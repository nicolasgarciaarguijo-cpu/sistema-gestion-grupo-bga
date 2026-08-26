// CUENTA CORRIENTE DE COMPRAS. Con algunos proveedores hay convenio de comprar e ir pagando
// diferido: cada factura SUMA a la cuenta y cada pago la DESCUENTA. Este modulo arma ese libro
// mayor -- movimiento por movimiento, con saldo corriente -- para saber cuanto se compro, cuanto se
// pago y cuanto se debe.
//
// Dos diferencias con domain/supplierAccounts.ts, que sigue vivo y hace otra cosa:
//   - supplierAccounts responde "que facturas no tienen un pago VINCULADO" (conciliacion factura a
//     factura). Su deuda es la suma de las facturas sin vincular.
//   - este modulo responde "cuanto le debemos a este proveedor" por diferencia entre TODO lo
//     comprado y TODO lo pagado, este o no conciliado factura por factura. Es el saldo de la cuenta.
// Los dos numeros pueden diferir mientras falte conciliar; por eso se muestran los dos y se avisa.
//
// Regla del usuario (2026-08-26): si una factura la pago de su bolsillo un empleado, un socio o
// cualquier tercero, la empresa le queda debiendo a esa persona hasta que se le reintegra. Esa deuda
// se quiere saldar rapido, asi que sale aparte de la de proveedores.

export type LedgerInvoice = {
  id: number;
  company: string;
  supplier: string;
  taxId: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  administration: "blanco" | "negro";
  // De donde salio la factura: cargada en Compras, levantada de caja chica o del listado de ARCA.
  origin: "compras" | "caja_chica" | "arca";
  paidByCostEntryId?: number | null;
  paidByBankEntryId?: number | null;
  // Quien puso la plata. Vacio = la empresa. Con nombre = esa persona la pago de su bolsillo y la
  // empresa le debe hasta `reimbursedAt`.
  paidByPerson?: string;
  reimbursedAt?: string;
};

export type LedgerPayment = {
  id: number;
  // "gasto" = CostEntry (el pago cargado); "banco" = debito del extracto que no tiene gasto asociado.
  kind: "gasto" | "banco";
  company: string;
  supplier: string;
  taxId: string;
  date: string;
  amount: number;
  administration: "blanco" | "negro";
  description: string;
  // Solo en kind "gasto": id del movimiento del banco con el que quedo conciliado. Sirve para no
  // contar dos veces el mismo peso cuando ese debito ademas entra por su cuenta como kind "banco"
  // (en un pago kind "banco" el id del movimiento ES `id`).
  bankEntryId?: number | null;
};

export type LedgerMovement = {
  key: string;
  type: "compra" | "pago";
  date: string;
  detail: string;
  amount: number; // compra suma, pago resta
  administration: "blanco" | "negro";
  saldo: number; // saldo de la cuenta DESPUES de este movimiento
  invoiceId?: number;
  paymentId?: number;
  // Solo en compras: si esta factura ya tiene un pago conciliado y quien puso la plata.
  conciliada?: boolean;
  paidByPerson?: string;
};

export type SupplierLedger = {
  key: string;
  supplier: string;
  taxId: string;
  // El proveedor esta marcado como cuenta corriente (hay convenio de pago diferido).
  esCuentaCorriente: boolean;
  comprado: number;
  pagado: number;
  saldo: number; // comprado - pagado; >0 = le debemos
  // Deuda medida por conciliacion (facturas sin pago vinculado). Si no coincide con `saldo`, falta
  // conciliar: hay pagos que todavia no se ataron a una factura.
  deudaSinConciliar: number;
  facturasSinPago: number;
  movimientos: LedgerMovement[];
};

export type PersonDebt = {
  person: string;
  total: number;
  count: number;
  invoices: LedgerInvoice[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const normalizeName = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const digits = (value: string) => String(value || "").replace(/\D/g, "");

// Llave del proveedor: el CUIT manda (es lo unico duro); si no hay, el nombre normalizado.
export function supplierKey(supplier: string, taxId: string): string {
  const cuit = digits(taxId);
  if (cuit.length >= 11) return cuit;
  return normalizeName(supplier) || "sin-proveedor";
}

const isConciliada = (inv: LedgerInvoice) =>
  inv.paidByCostEntryId != null || inv.paidByBankEntryId != null;

/**
 * Libro mayor por proveedor. `currentAccountKeys` son las llaves (CUIT o nombre normalizado) de los
 * proveedores marcados como cuenta corriente: se ordenan primero y quedan marcados, pero el resto
 * igual se calcula (un proveedor sin convenio tambien puede quedar debiendo).
 */
export function computeSupplierLedgers({
  invoices,
  payments,
  currentAccountKeys = [],
  companyScope = "__ALL__",
}: {
  invoices: LedgerInvoice[];
  payments: LedgerPayment[];
  currentAccountKeys?: string[];
  companyScope?: string;
}): { ledgers: SupplierLedger[]; saldoTotal: number; sinConciliarTotal: number } {
  const inScope = <T extends { company: string }>(rows: T[]) =>
    rows.filter((r) => companyScope === "__ALL__" || r.company === companyScope);
  const ccKeys = new Set(currentAccountKeys);

  // Un debito del banco que ya se cargo como gasto NO se cuenta de nuevo: el gasto es el mismo peso.
  const bankIdsYaEnGastos = new Set(
    inScope(payments)
      .filter((p) => p.kind === "gasto" && p.bankEntryId != null)
      .map((p) => Number(p.bankEntryId))
  );
  const pagosUnicos = inScope(payments).filter(
    (p) => p.kind === "gasto" || !bankIdsYaEnGastos.has(Number(p.id))
  );

  const byKey = new Map<string, SupplierLedger>();
  const ensure = (supplier: string, taxId: string): SupplierLedger => {
    const key = supplierKey(supplier, taxId);
    let acc = byKey.get(key);
    if (!acc) {
      acc = {
        key,
        supplier: supplier || "(sin proveedor)",
        taxId: taxId || "",
        esCuentaCorriente: ccKeys.has(key),
        comprado: 0,
        pagado: 0,
        saldo: 0,
        deudaSinConciliar: 0,
        facturasSinPago: 0,
        movimientos: [],
      };
      byKey.set(key, acc);
    }
    if (acc.supplier === "(sin proveedor)" && supplier) acc.supplier = supplier;
    if (!acc.taxId && taxId) acc.taxId = taxId;
    return acc;
  };

  for (const inv of inScope(invoices)) {
    const acc = ensure(inv.supplier, inv.taxId);
    const total = Number(inv.total || 0);
    acc.comprado += total;
    if (!isConciliada(inv)) {
      acc.deudaSinConciliar += total;
      acc.facturasSinPago += 1;
    }
    acc.movimientos.push({
      key: `inv-${inv.id}`,
      type: "compra",
      date: inv.invoiceDate || "",
      detail: inv.invoiceNumber ? `Factura ${inv.invoiceNumber}` : "Compra sin comprobante",
      amount: total,
      administration: inv.administration,
      saldo: 0,
      invoiceId: inv.id,
      conciliada: isConciliada(inv),
      paidByPerson: inv.paidByPerson || "",
    });
  }

  for (const pay of pagosUnicos) {
    const acc = ensure(pay.supplier, pay.taxId);
    const amount = Number(pay.amount || 0);
    acc.pagado += amount;
    acc.movimientos.push({
      key: `pay-${pay.kind}-${pay.id}`,
      type: "pago",
      date: pay.date || "",
      detail: pay.description || (pay.kind === "banco" ? "Debito del banco" : "Pago"),
      amount,
      administration: pay.administration,
      saldo: 0,
      paymentId: pay.id,
    });
  }

  const ledgers = Array.from(byKey.values()).map((acc) => {
    // Orden cronologico para que el saldo corriente se lea como un extracto. A igual fecha, primero
    // la compra: no se puede pagar algo que todavia no entro.
    acc.movimientos.sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        (a.type === b.type ? 0 : a.type === "compra" ? -1 : 1)
    );
    let saldo = 0;
    for (const mov of acc.movimientos) {
      saldo += mov.type === "compra" ? mov.amount : -mov.amount;
      mov.saldo = round2(saldo);
    }
    return {
      ...acc,
      comprado: round2(acc.comprado),
      pagado: round2(acc.pagado),
      saldo: round2(acc.comprado - acc.pagado),
      deudaSinConciliar: round2(acc.deudaSinConciliar),
    };
  });

  // Primero los de convenio, despues por saldo mas grande. Los saldados quedan al final.
  ledgers.sort(
    (a, b) =>
      Number(b.esCuentaCorriente) - Number(a.esCuentaCorriente) ||
      b.saldo - a.saldo ||
      a.supplier.localeCompare(b.supplier)
  );

  return {
    ledgers,
    saldoTotal: round2(ledgers.reduce((s, a) => s + Math.max(0, a.saldo), 0)),
    sinConciliarTotal: round2(ledgers.reduce((s, a) => s + a.deudaSinConciliar, 0)),
  };
}

/**
 * Deuda con la gente: facturas que puso de su bolsillo un empleado, un socio o un tercero y que
 * todavia no se le reintegraron. Es plata que la empresa debe devolver, no un gasto pendiente.
 */
export function computePersonDebts(
  invoices: LedgerInvoice[],
  companyScope: string = "__ALL__"
): { debts: PersonDebt[]; total: number } {
  const byPerson = new Map<string, PersonDebt>();
  for (const inv of invoices) {
    if (companyScope !== "__ALL__" && inv.company !== companyScope) continue;
    const person = String(inv.paidByPerson || "").trim();
    if (!person) continue;
    if (inv.reimbursedAt) continue;
    const key = normalizeName(person);
    let d = byPerson.get(key);
    if (!d) {
      d = { person, total: 0, count: 0, invoices: [] };
      byPerson.set(key, d);
    }
    d.total += Number(inv.total || 0);
    d.count += 1;
    d.invoices.push(inv);
  }
  const debts = Array.from(byPerson.values())
    .map((d) => ({
      ...d,
      total: round2(d.total),
      invoices: d.invoices.sort((a, b) => (a.invoiceDate || "").localeCompare(b.invoiceDate || "")),
    }))
    .sort((a, b) => b.total - a.total || a.person.localeCompare(b.person));
  return { debts, total: round2(debts.reduce((s, d) => s + d.total, 0)) };
}
