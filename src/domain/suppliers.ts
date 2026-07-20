// Proveedores y cotejo de pagos contra el extracto bancario.
//
// Regla del sistema (2026-07-19): la factura es solo registro; el gasto es el PAGO. Un pago en
// BLANCO que sale del BANCO tiene que aparecer si o si como debito en el extracto: eso es lo que
// permite cotejar que el pago cargado es correcto. Los pagos en efectivo/negro NO estan en el banco
// y por eso no se cotejan (no es un error que falten).
//
// Puro: solo texto y aritmetica, sin estado ni fechas del sistema.

import { saleDelBanco } from "./types";
import type { CostEntry, Supplier } from "./types";

const DIGITS = /\D+/g;

// Normaliza para comparar: sin acentos, sin puntuacion, minusculas, espacios colapsados.
// "S.A." y "SA" tienen que matchear; "De Raíz" y "DE RAIZ" tambien.
export function normalizeText(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const onlyDigits = (s: string): string => (s || "").replace(DIGITS, "");

// Los nombres cortos generan falsos positivos ("SA" matchearia en cualquier lado).
const MIN_NAME_LEN = 4;

export function supplierSearchTerms(supplier: Supplier): string[] {
  const terms = [supplier.name, ...String(supplier.aliases || "").split(",")]
    .map(normalizeText)
    .filter((t) => t.length >= MIN_NAME_LEN);
  return Array.from(new Set(terms));
}

// Busca a que proveedor corresponde el texto de un movimiento del banco.
// Primero por CUIT (llave dura: el banco lo pone en el concepto/referencia), despues por nombre o
// alias. Si hay varios candidatos por nombre, gana el termino MAS LARGO (el mas especifico).
export function findSupplierInText(text: string, suppliers: Supplier[]): Supplier | null {
  const activos = (suppliers || []).filter((s) => s.active !== false);
  if (activos.length === 0) return null;

  const digits = onlyDigits(text);
  if (digits.length >= 11) {
    const porCuit = activos.find((s) => {
      const cuit = onlyDigits(s.taxId);
      return cuit.length >= 11 && digits.includes(cuit);
    });
    if (porCuit) return porCuit;
  }

  const norm = normalizeText(text);
  let mejor: { supplier: Supplier; len: number } | null = null;
  for (const s of activos) {
    for (const term of supplierSearchTerms(s)) {
      if (norm.includes(term) && (!mejor || term.length > mejor.len)) {
        mejor = { supplier: s, len: term.length };
      }
    }
  }
  return mejor ? mejor.supplier : null;
}

export type BankDebit = {
  id: number;
  date: string; // yyyy-mm-dd
  amount: number;
  concept: string;
};

export type PaymentMatchStatus =
  | "conciliado" // encontro el debito y coincide
  | "sin_movimiento" // deberia estar en el banco y no aparece -> revisar
  | "no_aplica"; // efectivo o negro: no tiene por que estar en el banco

// Dias de tolerancia para encontrar el debito. El cheque NO se debita el dia que se entrega sino
// cuando lo cobran (30/60/90 dias es lo normal), asi que con la ventana corta darian todos como
// faltantes. Para el resto, 5 dias alcanza: el banco debita 1-2 dias despues de lo anotado.
export const DEFAULT_DAY_WINDOW = 5;
export const CHEQUE_DAY_WINDOW = 120;

export const dayWindowFor = (method?: string): number =>
  method === "cheque" ? CHEQUE_DAY_WINDOW : DEFAULT_DAY_WINDOW;

export type PaymentMatch = {
  paymentId: number;
  status: PaymentMatchStatus;
  bankEntryId?: number;
  diff?: number; // diferencia de monto contra el debito (0 si es exacto)
  detail: string;
};

const dayDiff = (a: string, b: string): number => {
  const da = Date.parse(`${(a || "").slice(0, 10)}T00:00:00Z`);
  const db = Date.parse(`${(b || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(da) || Number.isNaN(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(da - db) / 86400000;
};

// Un pago se cuenta como el mismo movimiento si el monto entra en la tolerancia y la fecha esta
// cerca. El banco debita 1-2 dias despues de lo anotado (visto en los echeq de fin de mes), asi que
// la ventana por defecto es de 5 dias.
export function reconcilePayment(
  payment: CostEntry,
  debits: BankDebit[],
  opts?: { amountTolerance?: number; dayWindow?: number }
): PaymentMatch {
  const amountTolerance = opts?.amountTolerance ?? 1;
  const dayWindow = opts?.dayWindow ?? dayWindowFor(payment.paymentMethod);

  // Solo se cotejan los pagos que TIENEN que estar en el banco. "Blanco" no alcanza: un pago blanco
  // puede haberse hecho en efectivo. Lo que manda es el medio de pago.
  if (payment.administration !== "blanco" || !saleDelBanco(payment.paymentMethod)) {
    return {
      paymentId: payment.id,
      status: "no_aplica",
      detail: "Pago en efectivo o en negro: no pasa por el banco.",
    };
  }

  // Si ya quedo conciliado a mano, se respeta.
  if (payment.bankEntryId) {
    const fijado = debits.find((d) => d.id === payment.bankEntryId);
    if (fijado) {
      const diff = Number(payment.amount || 0) - Number(fijado.amount || 0);
      return {
        paymentId: payment.id,
        status: "conciliado",
        bankEntryId: fijado.id,
        diff,
        detail: Math.abs(diff) <= amountTolerance ? "Vinculado a mano." : "Vinculado a mano (el monto no coincide).",
      };
    }
  }

  const monto = Number(payment.amount || 0);
  const candidatos = debits
    .filter((d) => Math.abs(Number(d.amount || 0) - monto) <= amountTolerance)
    .filter((d) => dayDiff(d.date, payment.date) <= dayWindow)
    .sort((a, b) => dayDiff(a.date, payment.date) - dayDiff(b.date, payment.date));

  if (candidatos.length === 0) {
    return {
      paymentId: payment.id,
      status: "sin_movimiento",
      detail: "No hay un debito del banco por ese monto en esos dias. Revisa el pago o falta cargar el extracto.",
    };
  }

  const elegido = candidatos[0];
  return {
    paymentId: payment.id,
    status: "conciliado",
    bankEntryId: elegido.id,
    diff: monto - Number(elegido.amount || 0),
    detail: `Coincide con el debito del ${elegido.date}.`,
  };
}

export type ReconciliationSummary = {
  matches: PaymentMatch[];
  conciliados: number;
  sinMovimiento: number;
  noAplica: number;
  montoSinMovimiento: number;
};

// Cotejo de una tanda de pagos. Un mismo debito no puede conciliar dos pagos distintos (si no, dos
// pagos iguales el mismo dia matchearian con el mismo movimiento y uno quedaria "ok" sin estarlo).
export function reconcilePayments(
  payments: CostEntry[],
  debits: BankDebit[],
  opts?: { amountTolerance?: number; dayWindow?: number }
): ReconciliationSummary {
  const usados = new Set<number>();
  const matches: PaymentMatch[] = [];

  // Los que ya tienen un debito fijado a mano se resuelven primero, para que reserven su movimiento.
  const ordenados = [...(payments || [])].sort(
    (a, b) => (b.bankEntryId ? 1 : 0) - (a.bankEntryId ? 1 : 0)
  );

  for (const payment of ordenados) {
    const disponibles = debits.filter((d) => !usados.has(d.id));
    const match = reconcilePayment(payment, disponibles, opts);
    if (match.bankEntryId) usados.add(match.bankEntryId);
    matches.push(match);
  }

  const porId = new Map(matches.map((m) => [m.paymentId, m]));
  const enOrden = (payments || []).map((p) => porId.get(p.id)!).filter(Boolean);

  return {
    matches: enOrden,
    conciliados: enOrden.filter((m) => m.status === "conciliado").length,
    sinMovimiento: enOrden.filter((m) => m.status === "sin_movimiento").length,
    noAplica: enOrden.filter((m) => m.status === "no_aplica").length,
    montoSinMovimiento: enOrden
      .filter((m) => m.status === "sin_movimiento")
      .reduce((acc, m) => {
        const p = (payments || []).find((x) => x.id === m.paymentId);
        return acc + Number(p?.amount || 0);
      }, 0),
  };
}
