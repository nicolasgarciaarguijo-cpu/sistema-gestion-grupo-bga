// Opcion A de la RESERVA: el sistema la CALCULA solo, juntando lo que ya vive en el sistema.
// Toma el saldo inicial (cierre de octubre 2025, validado contra el banco) + los movimientos de
// cada fuente, y los mapea a los inputs del dominio de reserva (ver reserva.ts).
//
// Fuentes y a que billetera van:
//   - Extractos bancarios (BankStatementEntry) -> banco / pesos / BLANCO (la plata del banco es blanca).
//     credito = ingreso, debito = egreso.
//   - Caja chica: la asignacion de un fondo entra al EFECTIVO (partida por blanco/negro segun
//     assignedWhite/assignedBlack); cada gasto sale del EFECTIVO con su color (administration).
//   - Cobros de trabajos aprobados hechos EN EFECTIVO -> entran al EFECTIVO con su color. Los que
//     entraron por transferencia o cheque NO se tocan: esa plata ya esta en el saldo del banco.
//   - Gastos de la solapa Costos que NO pasaron por el banco -> salen del EFECTIVO con su color.
//   - Movimientos internos (solapa Movimientos internos): el pase efectivo <-> banco. Ver
//     internalTransfersToMovements: solo se emite la pata de EFECTIVO, a proposito.
//   - Reintegros de la cuenta corriente con la gente pagados en efectivo -> salen del EFECTIVO.
//
// Saldo inicial (cierre oct-2025, de la reconciliacion banco↔planilla):
//   De Raíz Patagonia = 4.302.064,53 ; BGA (Patagonia −37.786,98 + Santander 499.220,44) = 461.433,46.
//   La reserva junta los dos bancos de BGA en una sola billetera "banco/pesos".
//   Dólares = 0 (confirmado). Efectivo inicial = 0 (caja chica se arranca de cero).

import { aggregateReserva } from "./reserva";
import type {
  ReservaColor,
  ReservaCurrency,
  ReservaKind,
  ReservaMovementInput,
  ReservaOpening,
  ReservaSummary,
} from "./reserva";

// Saldo inicial banco/pesos por empresa (cierre oct-2025). Clave = CompanyName tal cual en el sistema.
export const RESERVA_OPENING_BANK_ARS: Record<string, number> = {
  "De raiz s.r.l": 4302064.53,
  "BGA estudio de diseño y produccion industrial s.r.l": 461433.46,
};

export type BankEntryLike = {
  date: string;
  movementType: "credito" | "debito";
  amount: number;
};

export type PettyFundLike = {
  deliveredDate: string;
  assignedAmount: number;
  assignedWhite?: number;
  assignedBlack?: number;
};

export type PettyExpenseLike = {
  date: string;
  amount: number;
  administration: ReservaColor; // "blanco" | "negro"
};

export type ReservaSourcesInput = {
  openingBankArs?: number; // cierre oct de banco/pesos (0 si no se pasa)
  openingBankUsd?: number; // = 0 hoy
  openingCashArs?: number; // efectivo inicial (0 hoy)
  openingCashUsd?: number;
  bankEntries?: BankEntryLike[];
  pettyCashFunds?: PettyFundLike[];
  pettyCashExpenses?: PettyExpenseLike[];
  // Movimientos ya listos que no salen de las fuentes de arriba. Se usan para los cobros en USD de
  // los trabajos: los dolares NO aparecen en los extractos en pesos, asi que se inyectan aca sin
  // riesgo de doble conteo (a diferencia de un cobro en pesos, que ya viene por el banco).
  extraMovements?: ReservaMovementInput[];
  // Efectivo fuera del banco y de caja chica (caja de seguridad, etc.), cargado a mano.
  cashHoldings?: CashHoldingLike[];
  // Cobros de trabajos aprobados: solo los hechos en efectivo entran a la caja.
  jobPayments?: JobPaymentLike[];
  // Gastos de la solapa Costos: solo los que no pasaron por el banco salen de la caja.
  costEntries?: CostPaymentLike[];
  // Pases efectivo <-> banco de la solapa Movimientos internos.
  internalTransfers?: InternalTransferLike[];
  // Cuenta corriente con la gente: los reintegros pagados en efectivo bajan la caja.
  personLedgerEntries?: PersonLedgerPaymentLike[];
  until?: string; // corte por fecha (yyyy-mm-dd) para ver la reserva a un mes dado
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// --- Saldo de banco "que hay" -------------------------------------------------------------------
// Cada extracto trae el saldo acumulado por linea, asi que el saldo del ULTIMO movimiento (por fecha)
// de una cuenta ES la plata que hay en esa cuenta. Tomar el ultimo saldo por cuenta es robusto a los
// meses que falten cargar en el medio (p.ej. Patagonia nov–abril): no importa el hueco, el ultimo
// saldo cargado ya es acumulado. Esto es lo correcto para la reserva; sumar opening+movimientos NO,
// porque si faltan movimientos el neto queda mal por millones.

export type BankBalanceEntryLike = {
  company?: string;
  bank?: string;
  date: string; // "yyyy-mm-dd"
  balance?: number;
  id?: number;
  currency?: string; // "ARS" | "USD"; ausente = ARS (pesos). Una cuenta en USD es OTRA cuenta.
};

export type BankAccountBalance = {
  company: string;
  bank: string;
  currency: "ARS" | "USD";
  date: string;
  balance: number;
};

const normCurrency = (c?: string): "ARS" | "USD" =>
  String(c || "").toUpperCase() === "USD" ? "USD" : "ARS";

// Detecta si en esta cuenta el id CRECE con la fecha (Santander se carga cronologico: id mas alto =
// mas nuevo) o DECRECE (Patagonia sale del Excel al reves: id mas bajo = mas nuevo). Usa el signo de
// la covarianza id~fecha sobre todos los movimientos, asi no depende de una convencion fija de carga.
function idAscendsWithDate(list: BankBalanceEntryLike[]): boolean {
  const dates = Array.from(new Set(list.map((e) => e.date))).sort();
  const rank = new Map<string, number>();
  dates.forEach((d, i) => rank.set(d, i));
  const n = list.length;
  const meanId = list.reduce((s, e) => s + num(e.id), 0) / n;
  const meanRank = list.reduce((s, e) => s + (rank.get(e.date) ?? 0), 0) / n;
  let cov = 0;
  for (const e of list) cov += (num(e.id) - meanId) * ((rank.get(e.date) ?? 0) - meanRank);
  return cov >= 0; // por defecto (empate o una sola fecha) tratamos id como ascendente
}

// El movimiento cronologicamente ultimo de una cuenta. La fecha manda; para el desempate intradia
// elige el extremo de id correcto segun la direccion detectada (asi funciona igual para Santander
// que para Patagonia, que cargan los ids en sentidos opuestos).
function pickLatestEntry(list: BankBalanceEntryLike[]): BankBalanceEntryLike {
  const maxDate = list.reduce((m, e) => (e.date > m ? e.date : m), list[0].date);
  const sameDay = list.filter((e) => e.date === maxDate);
  if (sameDay.length === 1) return sameDay[0];
  const ascending = idAscendsWithDate(list);
  return sameDay.reduce(
    (best, e) => ((ascending ? num(e.id) > num(best.id) : num(e.id) < num(best.id)) ? e : best),
    sameDay[0]
  );
}

// Ultimo saldo por cuenta (empresa|banco). Opcional corte por `until`.
export function latestBankBalancesByAccount(
  entries: BankBalanceEntryLike[],
  until?: string
): BankAccountBalance[] {
  const groups = new Map<string, BankBalanceEntryLike[]>();
  for (const e of entries) {
    if (!e || !e.date) continue;
    if (until && e.date > until) continue;
    // La moneda entra en la clave: una cuenta en USD (misma "bank") es una cuenta DISTINTA de la de
    // pesos, y sus saldos NUNCA se mezclan (el peso y el dólar conviven, no se suman).
    const key = `${e.company ?? ""}||${e.bank ?? ""}||${normCurrency(e.currency)}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  return Array.from(groups.entries())
    .map(([key, list]) => {
      const [company, bank, currency] = key.split("||");
      const chosen = pickLatestEntry(list);
      return {
        company,
        bank,
        currency: currency as "ARS" | "USD",
        date: chosen.date,
        balance: num(chosen.balance),
      };
    })
    .sort(
      (a, b) =>
        a.company.localeCompare(b.company) ||
        a.bank.localeCompare(b.bank) ||
        a.currency.localeCompare(b.currency)
    );
}

// Suma de los ultimos saldos de todas las cuentas = plata en banco de la reserva (pesos, blanco).
export function sumLatestBankBalances(entries: BankBalanceEntryLike[], until?: string): number {
  return latestBankBalancesByAccount(entries, until).reduce((acc, a) => acc + a.balance, 0);
}

// Mapea los extractos bancarios a movimientos de reserva (banco / pesos / blanco).
export function bankEntriesToMovements(entries: BankEntryLike[]): ReservaMovementInput[] {
  return entries.map((e) => ({
    date: e.date,
    currency: "ARS",
    location: "banco",
    color: "blanco",
    kind: e.movementType === "credito" ? "ingreso" : "egreso",
    amount: num(e.amount),
  }));
}

// Mapea caja chica a movimientos de EFECTIVO. La asignacion del fondo entra; cada gasto sale.
export function pettyCashToMovements(
  funds: PettyFundLike[],
  expenses: PettyExpenseLike[]
): ReservaMovementInput[] {
  const out: ReservaMovementInput[] = [];

  funds.forEach((f) => {
    // Origen OBLIGATORIO: la caja chica NO se asume blanca. Solo entra a la reserva la plata con
    // circuito cargado (blanco/negro), segun de donde vino el efectivo. Lo que quede sin clasificar
    // (assignedAmount − blanco − negro) no se cuenta como blanco ni como negro: asi no se mezclan
    // administraciones. El sistema muestra ese remanente aparte para que el usuario lo clasifique.
    const white = num(f.assignedWhite);
    const black = num(f.assignedBlack);
    if (white > 0)
      out.push({ date: f.deliveredDate, currency: "ARS", location: "efectivo", color: "blanco", kind: "ingreso", amount: white });
    if (black > 0)
      out.push({ date: f.deliveredDate, currency: "ARS", location: "efectivo", color: "negro", kind: "ingreso", amount: black });
  });

  expenses.forEach((e) => {
    out.push({
      date: e.date,
      currency: "ARS",
      location: "efectivo",
      color: e.administration === "negro" ? "negro" : "blanco",
      kind: "egreso",
      amount: num(e.amount),
    });
  });

  return out;
}

export type UsdPaymentLike = {
  paymentDate?: string;
  amount: number;
  administration?: ReservaColor; // "blanco" | "negro"
  transactionType?: string; // "efectivo" | "transferencia" | "cheque" | "otros"
};

export type CashHoldingLike = {
  date: string; // "yyyy-mm-dd"
  currency?: ReservaCurrency; // ARS | USD (default ARS)
  color?: ReservaColor; // blanco | negro (default blanco)
  kind?: ReservaKind; // ingreso | egreso (default ingreso)
  amount: number;
};

// Efectivo fuera del banco y de caja chica (caja de seguridad, plata en mano) -> movimientos de
// reserva. Ubicacion SIEMPRE "efectivo"; color segun el origen que cargo el usuario (no se asume
// nada). Cada fila es un ingreso o egreso; la reserva lo suma en la billetera de efectivo por color.
export function cashHoldingsToMovements(items: CashHoldingLike[]): ReservaMovementInput[] {
  return items.map((h) => ({
    date: h.date,
    currency: h.currency === "USD" ? "USD" : "ARS",
    location: "efectivo",
    color: h.color === "negro" ? "negro" : "blanco",
    kind: h.kind === "egreso" ? "egreso" : "ingreso",
    amount: num(h.amount),
  }));
}

// Cobros en USD de los trabajos aprobados -> movimientos de reserva (ingreso, moneda USD).
// Ubicacion: transferencia va a "banco"; efectivo/cheque/otros van a "efectivo" (donde estan los
// dolares billete). Color por administracion (blanco/negro). Son SOLO ingresos: la conversion de
// USD a pesos, si algun dia se modela, seria un pasaje aparte (isTransfer).
export function usdPaymentsToMovements(payments: UsdPaymentLike[]): ReservaMovementInput[] {
  return payments.map((p) => ({
    date: p.paymentDate || "",
    currency: "USD" as const,
    location: p.transactionType === "transferencia" ? ("banco" as const) : ("efectivo" as const),
    color: p.administration === "negro" ? ("negro" as const) : ("blanco" as const),
    kind: "ingreso" as const,
    amount: num(p.amount),
  }));
}

// --- COBROS DE TRABAJOS EN EFECTIVO -------------------------------------------------------------
// Regla del usuario (2026-08-28): la billetera de efectivo se DERIVA del sistema, no se tipea aparte.
// Un cobro cargado en Trabajos aprobados con medio "efectivo" es plata que entro a la caja y que no
// deja ningun rastro en el extracto: si no entra por aca, no entra por ningun lado.
//
// Lo que NO entra, para no contar el mismo peso dos veces:
//   - transferencia y debito: ya estan en el saldo del banco;
//   - cheque: todavia no es plata (se cobra a 30/60/90); entra el dia que se acredita, por el banco;
//   - "otros": medio indefinido, no se asume que sea efectivo.
// El color sale de `administration` (ausente = blanco, como dice el tipo Payment).
export type JobPaymentLike = {
  paymentDate?: string;
  amount: number;
  currency?: string; // ausente = ARS
  transactionType?: string;
  administration?: ReservaColor;
  // Cobro en USD que se pesifico: sale del circuito dolar. La billetera USD no lo cuenta y la de
  // pesos tampoco (el equivalente en pesos descuenta del saldo del trabajo, no de la caja).
  arsApplied?: boolean;
};

export function cobroEntraAlEfectivo(payment: JobPaymentLike): boolean {
  if (String(payment.currency || "ARS").toUpperCase() === "USD") return false;
  return String(payment.transactionType || "") === "efectivo";
}

export function jobPaymentsToMovements(payments: JobPaymentLike[]): ReservaMovementInput[] {
  return payments.filter(cobroEntraAlEfectivo).map((p) => ({
    date: p.paymentDate || "",
    currency: "ARS" as const,
    location: "efectivo" as const,
    color: p.administration === "negro" ? ("negro" as const) : ("blanco" as const),
    kind: "ingreso" as const,
    amount: num(p.amount),
  }));
}

// --- GASTOS PAGADOS DE LA CAJA ------------------------------------------------------------------
// La contracara: un gasto de la solapa Costos pagado en efectivo baja la caja. Mismo criterio que
// `pagoAlimentaCalendario` en modo carga (domain/calendarFeeds.ts): sale del efectivo solo lo que NO
// paso por el banco. Un gasto importado del extracto, o conciliado contra un debito, o pagado por
// transferencia/cheque/debito automatico, ya bajo el saldo del banco: restarlo aca lo contaria dos veces.
export type CostPaymentLike = {
  date: string;
  amount: number;
  administration?: ReservaColor;
  source?: string; // "extracto" = el gasto ES un movimiento del banco importado
  bankEntryId?: number | null;
  paymentMethod?: string; // sin metodo cargado = se asume efectivo (la UI lo marca con la D)
};

export function gastoSaleDelEfectivo(entry: CostPaymentLike): boolean {
  if (String(entry.source || "") === "extracto") return false;
  if (entry.bankEntryId != null) return false;
  const metodo = String(entry.paymentMethod || "").trim();
  return !metodo || metodo === "efectivo";
}

export function costEntriesToMovements(entries: CostPaymentLike[]): ReservaMovementInput[] {
  return entries.filter(gastoSaleDelEfectivo).map((e) => ({
    date: e.date,
    currency: "ARS" as const,
    location: "efectivo" as const,
    color: e.administration === "negro" ? ("negro" as const) : ("blanco" as const),
    kind: "egreso" as const,
    amount: num(e.amount),
  }));
}

// --- REINTEGROS A LA GENTE ----------------------------------------------------------------------
// Devolverle la plata a alguien que la puso de su bolsillo (ver domain/personLedger.ts) SI saca plata
// de la empresa. Solo baja la caja si se le pago en efectivo: si se le transfirio, esa plata ya salio
// por el extracto y restarla aca la contaria dos veces. Mismo criterio que los gastos.
//
// El DEBE no aparece aca a proposito: cuando la persona pone la plata, la empresa no mueve un peso
// (por eso queda debiendo). La caja se mueve recien cuando se le devuelve.
export type PersonLedgerPaymentLike = {
  date: string;
  amount: number;
  kind?: string; // "debe" | "haber"
  color?: ReservaColor;
  paymentMethod?: string; // sin metodo cargado = se asume efectivo
};

export function reintegroSaleDelEfectivo(entry: PersonLedgerPaymentLike): boolean {
  if (String(entry.kind || "") !== "haber") return false;
  const metodo = String(entry.paymentMethod || "").trim();
  return !metodo || metodo === "efectivo";
}

export function personLedgerToMovements(entries: PersonLedgerPaymentLike[]): ReservaMovementInput[] {
  return entries.filter(reintegroSaleDelEfectivo).map((e) => ({
    date: e.date,
    currency: "ARS" as const,
    location: "efectivo" as const,
    color: e.color === "negro" ? ("negro" as const) : ("blanco" as const),
    kind: "egreso" as const,
    amount: num(e.amount),
  }));
}

// --- MOVIMIENTOS INTERNOS: EL PASE EFECTIVO <-> BANCO -------------------------------------------
// Deposito plata de la caja en el banco, o saco plata del cajero. Para la empresa no entro ni salio
// nada: cambio de bolsillo. Por eso van marcados isTransfer (mueven el saldo, no cuentan como
// ingreso/egreso).
//
// OJO, la sutileza que hace que el numero cierre: SOLO se emite la pata de EFECTIVO. La billetera de
// banco de este sistema no se arma sumando movimientos, se toma del ULTIMO SALDO del extracto
// (ver latestBankBalancesByAccount), y ese saldo YA tiene el deposito adentro. Emitir tambien la pata
// de banco sumaria el mismo deposito dos veces. Si algun dia el banco se arma por movimientos, esta
// funcion tiene que emitir las dos patas.
export type InternalTransferLike = {
  date: string;
  direction?: string; // "efectivo_a_banco" (deposito) | "banco_a_efectivo" (extraccion)
  currency?: ReservaCurrency;
  color?: ReservaColor;
  amount: number;
};

export function internalTransfersToMovements(items: InternalTransferLike[]): ReservaMovementInput[] {
  return items.map((t) => ({
    date: t.date,
    currency: t.currency === "USD" ? ("USD" as const) : ("ARS" as const),
    location: "efectivo" as const,
    color: t.color === "negro" ? ("negro" as const) : ("blanco" as const),
    // Deposito = sale de la caja; extraccion = entra a la caja.
    kind: t.direction === "banco_a_efectivo" ? ("ingreso" as const) : ("egreso" as const),
    amount: num(t.amount),
    isTransfer: true,
  }));
}

// Arma la reserva de UNA empresa desde las fuentes del sistema.
export function buildReservaFromSources(input: ReservaSourcesInput): ReservaSummary {
  const openings: ReservaOpening[] = [
    { currency: "ARS", location: "banco", color: "blanco", amount: num(input.openingBankArs) },
    { currency: "USD", location: "banco", color: "blanco", amount: num(input.openingBankUsd) },
    { currency: "ARS", location: "efectivo", color: "blanco", amount: num(input.openingCashArs) },
    { currency: "USD", location: "efectivo", color: "blanco", amount: num(input.openingCashUsd) },
  ];

  const movements: ReservaMovementInput[] = [
    ...bankEntriesToMovements(input.bankEntries || []),
    ...pettyCashToMovements(input.pettyCashFunds || [], input.pettyCashExpenses || []),
    ...cashHoldingsToMovements(input.cashHoldings || []),
    ...jobPaymentsToMovements(input.jobPayments || []),
    ...costEntriesToMovements(input.costEntries || []),
    ...internalTransfersToMovements(input.internalTransfers || []),
    ...personLedgerToMovements(input.personLedgerEntries || []),
    ...(input.extraMovements || []),
  ];

  return aggregateReserva({ openings, movements, until: input.until });
}

// --- SERIE DIARIA DE LA BILLETERA ---------------------------------------------------------------
// Cuanta plata habia CADA DIA, separada en banco / efectivo blanco / efectivo negro. Pedido de
// Nicolas (2026-08-28) para verlo en el Calendario anual arriba de los totales, en filas fijas por
// empresa: en un cash flow no alcanza la foto de hoy, hace falta el saldo dia a dia.
//
// El BANCO no se acumula sumando movimientos: cada linea del extracto trae su saldo acumulado, asi
// que el saldo de un dia es el ultimo saldo de cada cuenta hasta ese dia (mismo criterio que usa la
// reserva; ver latestBankBalancesByAccount). Eso lo hace robusto a meses que falten en el medio.
// El EFECTIVO si se acumula: es la suma de los movimientos de caja hasta ese dia, por color.
export type SaldoDelDia = {
  iso: string;
  banco: number;
  efectivoBlanco: number;
  efectivoNegro: number;
};

export function serieDiariaDeBilletera(
  input: ReservaSourcesInput & { bankBalanceEntries?: BankBalanceEntryLike[] },
  dias: string[]
): SaldoDelDia[] {
  // Los movimientos de EFECTIVO en pesos, que son los unicos que se acumulan dia a dia.
  const movimientos = [
    ...pettyCashToMovements(input.pettyCashFunds || [], input.pettyCashExpenses || []),
    ...cashHoldingsToMovements(input.cashHoldings || []),
    ...jobPaymentsToMovements(input.jobPayments || []),
    ...costEntriesToMovements(input.costEntries || []),
    ...internalTransfersToMovements(input.internalTransfers || []),
    ...personLedgerToMovements(input.personLedgerEntries || []),
  ].filter((m) => m.currency === "ARS" && m.location === "efectivo");

  // Se agrupa por dia una sola vez: recorrer todos los movimientos por cada dia seria O(dias x movs).
  const porDia = new Map<string, { blanco: number; negro: number }>();
  movimientos.forEach((m) => {
    const signo = m.kind === "egreso" ? -1 : 1;
    const d = porDia.get(m.date) || { blanco: 0, negro: 0 };
    if (m.color === "negro") d.negro += signo * num(m.amount);
    else d.blanco += signo * num(m.amount);
    porDia.set(m.date, d);
  });

  const bancoEntries = input.bankBalanceEntries || [];
  let blanco = num(input.openingCashArs);
  let negro = 0;
  return dias.map((iso) => {
    const d = porDia.get(iso);
    if (d) {
      blanco += d.blanco;
      negro += d.negro;
    }
    return {
      iso,
      banco: bancoEntries.length ? sumLatestBankBalances(bancoEntries, iso) : 0,
      efectivoBlanco: Math.round(blanco * 100) / 100,
      efectivoNegro: Math.round(negro * 100) / 100,
    };
  });
}
