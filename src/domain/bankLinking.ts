// Vincular la plata del banco que quedo SIN CLASIFICAR con lo que YA existe en el sistema.
//
// Regla del usuario (roadmap del Calendario anual): un CREDITO sin vinculo es el cobro de un TRABAJO
// (ppto · cliente) y un DEBITO es un pago a un PROVEEDOR — idealmente, la FACTURA DE COMPRA que
// cancela. Este modulo es solo la parte pensable: dado un debito y un proveedor, que facturas
// impagas podrian ser. La decision final SIEMPRE es del usuario (el cruce es manual).
//
// Puro: texto y aritmetica, sin estado ni fechas del sistema.

import { normalizeText, onlyDigits } from "./suppliers";

export type LinkableInvoice = {
  id: number;
  company: string;
  supplier: string;
  taxId: string;
  invoiceNumber: string;
  invoiceDate: string; // yyyy-mm-dd
  total: number;
  paid: boolean; // ya tiene un pago vinculado (pago cargado o movimiento del banco)
  // Debito del banco que la cancela, si se vinculo desde el Calendario anual (para poder soltarlo).
  paidByBankEntryId?: number | null;
};

export type InvoiceCandidate = {
  invoice: LinkableInvoice;
  sameAmount: boolean; // el importe coincide (dentro de la tolerancia)
  dayDiff: number; // dias entre la fecha de la factura y la del debito (Infinity si falta una)
};

// $1 de tolerancia: cubre redondeos, no diferencias reales.
export const AMOUNT_TOLERANCE = 1;
// Una factura se paga bastante despues de emitida (cheques a 30/60/90), asi que la ventana es ancha.
export const DAY_WINDOW = 120;

const dayDiff = (a: string, b: string): number => {
  const da = Date.parse(`${(a || "").slice(0, 10)}T00:00:00Z`);
  const db = Date.parse(`${(b || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(da) || Number.isNaN(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(da - db) / 86400000;
};

// Comparar nombres SIN espacios: en el sistema el mismo proveedor aparece como "MADERAS DAC S.A.",
// "Maderas DAC SA" o "maderas dac s a". Pegando las letras, los tres son el mismo texto.
const compact = (s: string): string => normalizeText(s).replace(/ /g, "");
// Nombres muy cortos generan falsos positivos ("sa" estaria adentro de cualquiera).
const MIN_NAME_LEN = 4;

// La factura es de ese proveedor? Primero por CUIT (llave dura); si no hay, por nombre normalizado.
export function invoiceIsFrom(
  invoice: { supplier: string; taxId: string },
  supplier: { name: string; taxId?: string }
): boolean {
  const cuitInv = onlyDigits(invoice.taxId);
  const cuitProv = onlyDigits(supplier.taxId || "");
  if (cuitInv.length >= 11 && cuitProv.length >= 11) return cuitInv === cuitProv;
  const a = compact(invoice.supplier);
  const b = compact(supplier.name);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.length >= MIN_NAME_LEN && b.length >= MIN_NAME_LEN && (a.includes(b) || b.includes(a));
}

// Facturas impagas que ese debito PODRIA estar pagando, de la mas probable a la menos.
// Orden: primero las del mismo importe, despues las mas cercanas en fecha.
// Se muestran las de la ventana de dias; una factura del mismo importe se muestra igual aunque
// este lejos en el tiempo (el importe exacto pesa mas que la fecha).
export function invoiceCandidates(
  debit: { company: string; date: string; amount: number },
  supplier: { name: string; taxId?: string } | null,
  invoices: LinkableInvoice[],
  opts?: { amountTolerance?: number; dayWindow?: number }
): InvoiceCandidate[] {
  const tol = opts?.amountTolerance ?? AMOUNT_TOLERANCE;
  const win = opts?.dayWindow ?? DAY_WINDOW;
  const monto = Math.abs(Number(debit.amount || 0));
  return (invoices || [])
    .filter((i) => !i.paid)
    .filter((i) => !debit.company || !i.company || i.company === debit.company)
    .filter((i) => !supplier || invoiceIsFrom(i, supplier))
    .map((invoice) => ({
      invoice,
      sameAmount: Math.abs(Number(invoice.total || 0) - monto) <= tol,
      dayDiff: dayDiff(invoice.invoiceDate, debit.date),
    }))
    .filter((c) => c.sameAmount || c.dayDiff <= win)
    .sort(
      (a, b) =>
        Number(b.sameAmount) - Number(a.sameAmount) ||
        a.dayDiff - b.dayDiff ||
        (b.invoice.invoiceDate || "").localeCompare(a.invoice.invoiceDate || "")
    );
}
