// Motor de "completitud" por entidad (Fase 2 de la pill "D").
// Mismo criterio que domain/bankAssignment.ts: una sola verdad que dice QUÉ le falta a cada registro.
// De acá sale la pill "D" en toda la app. Puro y testeable.
import type { PurchaseInvoice, Payment } from "./types";

// Factura de compra: falta info del comprobante en sí.
export function purchaseInvoiceMissing(
  inv: Partial<Pick<PurchaseInvoice, "supplier" | "taxId" | "invoiceDate" | "total">>
): string[] {
  const missing: string[] = [];
  if (!inv.supplier || !inv.supplier.trim()) missing.push("proveedor");
  if (!inv.taxId || !inv.taxId.trim()) missing.push("CUIT");
  if (!inv.invoiceDate || !inv.invoiceDate.trim()) missing.push("fecha");
  if (!(Number(inv.total) > 0)) missing.push("monto");
  return missing;
}
export const purchaseInvoiceComplete = (inv: Parameters<typeof purchaseInvoiceMissing>[0]): boolean =>
  purchaseInvoiceMissing(inv).length === 0;

// Pago de un trabajo aprobado: falta monto, fecha, o (si es USD pesificado) la cotización.
export function jobPaymentMissing(
  p: Partial<Pick<Payment, "amount" | "paymentDate" | "currency" | "arsApplied" | "exchangeRate">>
): string[] {
  const missing: string[] = [];
  if (!(Number(p.amount) > 0)) missing.push("monto");
  if (!p.paymentDate || !p.paymentDate.trim()) missing.push("fecha");
  if (p.currency === "USD" && p.arsApplied === true && !(Number(p.exchangeRate) > 0))
    missing.push("cotización");
  return missing;
}
export const jobPaymentComplete = (p: Parameters<typeof jobPaymentMissing>[0]): boolean =>
  jobPaymentMissing(p).length === 0;
