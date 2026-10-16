// NOTAS DE CREDITO DE PROVEEDORES (Nicolas, 2026-10-16): el bloque en la ficha del proveedor.
//
// Una nota de credito es un comprobante del proveedor que ANULA (todo o parte de) lo facturado: baja lo
// que le debemos y baja el credito fiscal de IVA. NO mueve plata (como la factura, es registro): si la
// factura ya estaba pagada, el proveedor queda A FAVOR (nos debe o lo descontamos de la proxima).
// Puede aplicarse a una factura puntual (`facturaId`): esa factura pasa a deber solo la diferencia.
// Puro y testeable.

export type NotaCreditoCompra = {
  id: number;
  company: string;
  supplier: string;
  taxId: string;
  receiptLetter: string;
  number: string;
  date: string;
  net: number;
  vat: number;
  total: number;
  administration: "blanco" | "negro";
  facturaId?: number | null; // factura a la que se aplica (opcional)
  motivo: string;
  source?: "manual" | "arca";
  notes?: string;
};

// Los tipos de comprobante de ARCA que son nota de credito ("3 - Nota de Crédito A", "8 - Nota de Crédito B"...).
export const esNotaDeCredito = (kind: string) => /nota\s+de\s+cr[eé]dito/i.test(String(kind || ""));

const r2 = (n: number) => Math.round(n * 100) / 100;

// Cuanto credito tiene aplicado cada factura (suma de las notas que la apuntan).
export function creditoAplicadoPorFactura(notas: Array<Pick<NotaCreditoCompra, "facturaId" | "total">>): Map<number, number> {
  const out = new Map<number, number>();
  notas.forEach((n) => {
    if (n.facturaId == null) return;
    out.set(n.facturaId, r2((out.get(n.facturaId) || 0) + Math.max(0, Number(n.total || 0))));
  });
  return out;
}

// Lo que queda por pagar de una factura despues de sus notas de credito (nunca negativo).
export const saldoDeFactura = (total: number, aplicado: number) => r2(Math.max(0, Number(total || 0) - Math.max(0, Number(aplicado || 0))));
