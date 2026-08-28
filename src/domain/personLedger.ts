// CUENTA CORRIENTE CON LA GENTE.
//
// Definicion de Nicolas (2026-08-28): "es una cuenta corriente por si alguien puso plata de mas para
// pagar algo con la empresa; o porque no se tuvo en consideracion ese gasto, o porque hubo un
// imprevisto, o porque se excedio el consumo de la caja chica asignada".
//
// O sea: NO es un flag por factura, es un saldo por persona con movimientos.
//   DEBE  = la persona puso plata -> la empresa le debe.
//   HABER = se le devolvio.
//   saldo = debe - haber. Positivo: la empresa le debe. Negativo: la persona tiene plata de la empresa.
//
// Tres fuentes, dos automaticas y una manual:
//   1. FACTURAS de compra con `paidByPerson`: la puso alguien de su bolsillo -> DEBE. Si ademas tiene
//      `reimbursedAt` (el boton "Marcar reintegrado" de Compras), se emite el HABER que la cancela.
//      Las dos patas quedan a la vista: la cuenta corriente muestra la historia, no solo el neto.
//   2. CAJA CHICA sobre-rendida: lo que se gasto de mas sobre el fondo asignado lo puso el
//      responsable -> DEBE. Y cuando un fondo POSTERIOR del mismo responsable absorbe esa deuda
//      (lo que le queda por gastar se descuenta), eso es un HABER. Es la regla que antes vivia
//      suelta en App.tsx: ahora vive aca y la usan las dos pantallas.
//   3. MANUAL: lo que no cuelga de ninguna factura ni de ningun fondo -- el imprevisto, el gasto que
//      no se tuvo en cuenta, y los reintegros (que son HABER).
//
// OJO con la plata: un DEBE no mueve la caja (la puso la persona, no la empresa). Un HABER SI, pero
// solo si se pago en efectivo; si se pago por transferencia esa plata ya salio por el extracto y
// contarla aca la duplicaria. Quien traduce eso a movimientos de billetera es
// domain/reservaSources.ts (personLedgerToMovements), con el mismo criterio que los gastos.

export type PersonLedgerKind = "debe" | "haber";
export type PersonLedgerColor = "blanco" | "negro";

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Misma normalizacion que usa el resto del sistema para cruzar nombres escritos a mano.
export const normalizePersonName = (value: string): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// --- Entradas ------------------------------------------------------------------------------------

// Movimiento cargado a mano (persistido). Ver domain/types.ts PersonLedgerEntry.
export type PersonLedgerEntryLike = {
  id: number;
  company: string;
  person: string;
  date: string;
  kind: PersonLedgerKind;
  amount: number;
  color?: PersonLedgerColor;
  // Solo para los HABER: como se le devolvio la plata. Decide si baja la caja de efectivo.
  paymentMethod?: string;
  description?: string;
};

export type PersonLedgerInvoiceLike = {
  id: number;
  company: string;
  paidByPerson?: string;
  reimbursedAt?: string;
  invoiceDate?: string;
  total: number;
  supplier?: string;
};

export type PersonLedgerFundLike = {
  id: number;
  company: string;
  responsible?: string;
  deliveredDate?: string;
  assignedAmount: number;
  renderedAmount: number;
};

// --- Salidas -------------------------------------------------------------------------------------

export type PersonLedgerMovement = {
  key: string; // unico y estable, para el key de React
  source: "factura" | "caja-chica" | "manual";
  person: string;
  company: string;
  date: string;
  kind: PersonLedgerKind;
  amount: number;
  color: PersonLedgerColor;
  description: string;
  // Solo los manuales se editan/borran desde la cuenta corriente. Los automaticos se arreglan en su
  // solapa de origen (Compras o Caja chica): la cuenta corriente los refleja, no los manda.
  entryId?: number;
};

export type PersonLedgerAccount = {
  person: string;
  debe: number;
  haber: number;
  saldo: number; // debe - haber
  movements: PersonLedgerMovement[]; // mas nuevo primero
};

export type PersonLedgerSummary = {
  accounts: PersonLedgerAccount[]; // ordenadas por saldo descendente
  total: number; // suma de los saldos POSITIVOS: lo que la empresa tiene para devolver
  aFavorTotal: number; // suma de los saldos negativos (en positivo): plata de la empresa en la calle
};

// --- Caja chica: el arrastre de deuda del responsable ---------------------------------------------

export type PettyCarryResult = {
  // Por fondo: cuanto de su saldo se uso para tapar deuda vieja, y que queda realmente para gastar.
  byFund: Map<number, { ajuste: number; adjustedRemaining: number }>;
  // Por responsable (clave normalizada): lo que la empresa le sigue debiendo.
  byResponsible: Map<string, { responsible: string; debt: number }>;
  total: number;
};

/**
 * Netea la deuda de caja chica de cada responsable.
 *
 * Si una caja se sobregira, la empresa le queda debiendo al responsable. Cuando se le asigna OTRA
 * caja, lo que le queda por gastar se descuenta de esa deuda (figura como "Ajuste de deuda" en la
 * caja nueva). Procesa las cajas de cada responsable por orden de creacion (id), arrastrando.
 */
export function carryPettyCashDebt(funds: PersonLedgerFundLike[]): PettyCarryResult {
  const byFund = new Map<number, { ajuste: number; adjustedRemaining: number }>();
  const byResponsible = new Map<string, { responsible: string; debt: number }>();

  const grupos = new Map<string, PersonLedgerFundLike[]>();
  funds.forEach((fund) => {
    const nombre = String(fund.responsible || "").trim();
    // Un fondo sin responsable no se mezcla con nadie: es su propio grupo.
    const key = normalizePersonName(nombre) || `__sin_responsable_${fund.id}`;
    const list = grupos.get(key) || [];
    list.push(fund);
    grupos.set(key, list);
  });

  let total = 0;
  grupos.forEach((lista, key) => {
    const ordenados = lista.slice().sort((a, b) => a.id - b.id);
    const nombre = String(ordenados[0].responsible || "").trim();
    let arrastre = 0;
    ordenados.forEach((fund) => {
      const propio = num(fund.assignedAmount) - num(fund.renderedAmount);
      if (propio < 0) {
        arrastre += -propio;
        byFund.set(fund.id, { ajuste: 0, adjustedRemaining: propio });
      } else if (arrastre > 0) {
        const ajuste = Math.min(propio, arrastre);
        arrastre -= ajuste;
        byFund.set(fund.id, { ajuste, adjustedRemaining: propio - ajuste });
      } else {
        byFund.set(fund.id, { ajuste: 0, adjustedRemaining: propio });
      }
    });
    if (nombre) byResponsible.set(key, { responsible: nombre, debt: round2(arrastre) });
    total += arrastre;
  });

  return { byFund, byResponsible, total: round2(total) };
}

// --- La cuenta corriente ------------------------------------------------------------------------

export type BuildPersonLedgerInput = {
  invoices?: PersonLedgerInvoiceLike[];
  pettyCashFunds?: PersonLedgerFundLike[];
  entries?: PersonLedgerEntryLike[];
  companyScope?: string; // "__ALL__" o el nombre de la empresa
};

const enScope = (company: string, scope?: string) =>
  !scope || scope === "__ALL__" || String(company) === scope;

export function buildPersonLedger(input: BuildPersonLedgerInput): PersonLedgerSummary {
  const movements: PersonLedgerMovement[] = [];

  // 1) Facturas de compra que puso alguien de su bolsillo.
  (input.invoices || []).forEach((inv) => {
    const person = String(inv.paidByPerson || "").trim();
    if (!person) return;
    if (!enScope(inv.company, input.companyScope)) return;
    const monto = round2(num(inv.total));
    const detalle = inv.supplier ? `Factura de ${inv.supplier}` : "Factura de compra";
    movements.push({
      key: `factura-debe-${inv.id}`,
      source: "factura",
      person,
      company: String(inv.company),
      date: String(inv.invoiceDate || ""),
      kind: "debe",
      amount: monto,
      color: "blanco",
      description: `${detalle} · la puso ${person}`,
    });
    // La pata que la cancela, si en Compras se marco el reintegro.
    const reintegro = String(inv.reimbursedAt || "").trim();
    if (reintegro) {
      movements.push({
        key: `factura-haber-${inv.id}`,
        source: "factura",
        person,
        company: String(inv.company),
        date: reintegro,
        kind: "haber",
        amount: monto,
        color: "blanco",
        description: `Reintegro de ${detalle.toLowerCase()} (marcado en Compras)`,
      });
    }
  });

  // 2) Caja chica: lo que se gasto de mas lo puso el responsable.
  const fondos = (input.pettyCashFunds || []).filter((f) => enScope(f.company, input.companyScope));
  const carry = carryPettyCashDebt(fondos);
  fondos.forEach((fund) => {
    const person = String(fund.responsible || "").trim();
    if (!person) return;
    const info = carry.byFund.get(fund.id);
    const propio = num(fund.assignedAmount) - num(fund.renderedAmount);
    if (propio < 0) {
      movements.push({
        key: `caja-debe-${fund.id}`,
        source: "caja-chica",
        person,
        company: String(fund.company),
        date: String(fund.deliveredDate || ""),
        kind: "debe",
        amount: round2(-propio),
        color: "blanco",
        description: "Caja chica excedida: gasto mas de lo asignado",
      });
    }
    if (info && info.ajuste > 0) {
      movements.push({
        key: `caja-haber-${fund.id}`,
        source: "caja-chica",
        person,
        company: String(fund.company),
        date: String(fund.deliveredDate || ""),
        kind: "haber",
        amount: round2(info.ajuste),
        color: "blanco",
        description: "Se le descontó de un fondo posterior (ajuste de deuda)",
      });
    }
  });

  // 3) Lo cargado a mano: el imprevisto, el gasto no previsto y los reintegros.
  (input.entries || []).forEach((entry) => {
    const person = String(entry.person || "").trim();
    if (!person) return;
    if (!enScope(entry.company, input.companyScope)) return;
    movements.push({
      key: `manual-${entry.id}`,
      source: "manual",
      person,
      company: String(entry.company),
      date: String(entry.date || ""),
      kind: entry.kind === "haber" ? "haber" : "debe",
      amount: round2(num(entry.amount)),
      color: entry.color === "negro" ? "negro" : "blanco",
      description: String(entry.description || "").trim() || (entry.kind === "haber" ? "Reintegro" : "Puso plata"),
      entryId: entry.id,
    });
  });

  // Agrupa por persona (nombres escritos a mano: se cruzan normalizados).
  const porPersona = new Map<string, PersonLedgerAccount>();
  movements.forEach((mov) => {
    const key = normalizePersonName(mov.person);
    let cuenta = porPersona.get(key);
    if (!cuenta) {
      cuenta = { person: mov.person, debe: 0, haber: 0, saldo: 0, movements: [] };
      porPersona.set(key, cuenta);
    }
    if (mov.kind === "haber") cuenta.haber += mov.amount;
    else cuenta.debe += mov.amount;
    cuenta.movements.push(mov);
  });

  const accounts = Array.from(porPersona.values())
    .map((cuenta) => ({
      ...cuenta,
      debe: round2(cuenta.debe),
      haber: round2(cuenta.haber),
      saldo: round2(cuenta.debe - cuenta.haber),
      movements: cuenta.movements.sort(
        (a, b) => (b.date || "").localeCompare(a.date || "") || a.key.localeCompare(b.key)
      ),
    }))
    .filter((cuenta) => cuenta.movements.length > 0)
    .sort((a, b) => b.saldo - a.saldo || a.person.localeCompare(b.person));

  return {
    accounts,
    total: round2(accounts.reduce((acc, c) => acc + Math.max(0, c.saldo), 0)),
    aFavorTotal: round2(accounts.reduce((acc, c) => acc + Math.max(0, -c.saldo), 0)),
  };
}
