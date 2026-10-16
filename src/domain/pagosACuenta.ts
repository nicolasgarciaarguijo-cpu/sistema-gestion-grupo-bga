// PAGOS A CUENTA SIN FACTURA (Nicolas, 2026-10-16): "siempre que se abra una ficha existe la posibilidad de
// que se pague algo y todavia no este la factura. Ese pago figura en el cash flow y en la ficha del proveedor
// queda saldo a favor hasta que se presente la factura. Tiene que haber un aviso para que no quede en el
// olvido."
//
// El pago es un CostEntry comun (va al cash flow y baja la cuenta) marcado `aCuenta`. Mientras ninguna
// factura lo tenga vinculado (`PurchaseInvoice.paidByCostEntryId`), esta PENDIENTE de factura: la cuenta
// corriente del proveedor queda a favor (el libro mayor ya resta todo lo pagado) y se avisa. Al cargar la
// factura y vincularle ese pago, deja de estar pendiente. Puro y testeable.
import { supplierKey } from "./purchaseLedger";

export type PagoACuentaLike = {
  id: number;
  company: string;
  date: string;
  amount: number;
  supplier: string;
  taxId?: string;
  aCuenta?: boolean;
  resolucionSinFactura?: { tipo: string } | null;
  administration?: string;
  paymentMethod?: string;
  description?: string;
};

export type PagoSinFactura = {
  id: number;
  company: string;
  date: string;
  amount: number;
  supplier: string;
  key: string; // supplierKey (CUIT o nombre)
  dias: number; // dias desde el pago
  administration: "blanco" | "negro";
};

const diasEntre = (desde: string, hasta: string) => {
  const a = Date.parse(desde);
  const b = Date.parse(hasta);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.floor((b - a) / 86400000)) : 0;
};

export function pagosSinFactura(
  pagos: PagoACuentaLike[],
  facturas: Array<{ paidByCostEntryId?: number | null }>,
  hoy: string
): PagoSinFactura[] {
  const vinculados = new Set(facturas.map((f) => f.paidByCostEntryId).filter((x): x is number => x != null));
  return pagos
    // Pendiente hasta que: se le vincule una factura, o se resuelva con comprobante (gasto en negro) o con
    // un responsable que asume la falta de la factura (queda como firmante).
    .filter((p) => p.aCuenta && !vinculados.has(p.id) && !p.resolucionSinFactura)
    .map((p) => ({
      id: p.id,
      company: String(p.company),
      date: p.date,
      amount: Number(p.amount || 0),
      supplier: p.supplier || "(sin proveedor)",
      key: supplierKey(p.supplier, p.taxId || ""),
      dias: diasEntre(p.date, hoy),
      administration: (p.administration === "negro" ? "negro" : "blanco") as "blanco" | "negro",
    }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

// Total pendiente por empresa (para el aviso de la barra de arriba).
export function resumenPagosSinFactura(pendientes: PagoSinFactura[], company?: string) {
  const delScope = pendientes.filter((p) => !company || p.company === company);
  return {
    cantidad: delScope.length,
    total: Math.round(delScope.reduce((a, p) => a + p.amount, 0) * 100) / 100,
    masViejo: delScope[0]?.dias || 0,
  };
}
