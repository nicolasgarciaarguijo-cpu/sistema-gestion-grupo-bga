// VARIOS PAGOS SOBRE UNA FACTURA (Nicolas, 2026-10-20): "necesito poder realizar sobre una factura varios
// pagos asociados". Una factura de compra junta TODOS sus pagos (CostEntry) en `pagosIds`. Queda PAGADA
// cuando lo pagado llega al total (tolerancia $1); hasta ahi muestra el saldo que falta.
//
// `paidByCostEntryId` sigue diciendo "esta factura esta pagada" (lo leen la cuenta corriente, Pagos
// programados, los pagos a cuenta...): se llena SOLO con la factura completa y apunta al ultimo pago.
// Asi el resto del sistema no cambia, y una factura a medio pagar sigue figurando como deuda por el saldo.

export type FacturaConPagos = {
  total: number;
  paidByCostEntryId?: number | null;
  pagosIds?: number[];
};

const TOLERANCIA = 1;

/** Todos los pagos de la factura: los de la lista y el viejo (una factura de antes tenia uno solo). */
export function pagosDeFactura(f: FacturaConPagos): number[] {
  const ids = [...(f.pagosIds || [])];
  if (f.paidByCostEntryId != null && !ids.includes(f.paidByCostEntryId)) ids.push(f.paidByCostEntryId);
  return ids;
}

export type EstadoPagos = { pagado: number; saldo: number; completa: boolean; ids: number[] };

export function estadoDePagos(f: FacturaConPagos, montoDe: (costEntryId: number) => number | undefined): EstadoPagos {
  const ids = pagosDeFactura(f).filter((id) => montoDe(id) !== undefined);
  const pagado = Math.round(ids.reduce((a, id) => a + Number(montoDe(id) || 0), 0) * 100) / 100;
  const total = Number(f.total || 0);
  const saldo = Math.max(0, Math.round((total - pagado) * 100) / 100);
  return { pagado, saldo, completa: ids.length > 0 && pagado >= total - TOLERANCIA, ids };
}

/** Como queda el vinculo despues de cambiar los pagos: la lista, y el "pagada" solo si se completo. */
export function vinculoDePagos(
  total: number,
  pagos: Array<{ id: number; monto: number }>
): { pagosIds: number[]; paidByCostEntryId: number | null } {
  const pagosIds = pagos.map((p) => p.id);
  const pagado = pagos.reduce((a, p) => a + Number(p.monto || 0), 0);
  const completa = pagos.length > 0 && pagado >= Number(total || 0) - TOLERANCIA;
  return { pagosIds, paidByCostEntryId: completa ? pagos[pagos.length - 1].id : null };
}

/** Ids de todos los pagos que ya estan vinculados a alguna factura (para no ofrecerlos de nuevo). */
export function pagosVinculados(facturas: FacturaConPagos[]): Set<number> {
  const s = new Set<number>();
  facturas.forEach((f) => pagosDeFactura(f).forEach((id) => s.add(id)));
  return s;
}
