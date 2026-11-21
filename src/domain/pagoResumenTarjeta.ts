// EL PAGO DEL RESUMEN DE TARJETA (Nicolas, 21/11/2026):
//   "si yo coloco pagado, el importe del resumen debe descontarse de la cuenta. Todo el tema del linkeo con
//    facturas es un tema de control. Si existe alguna factura que no se linkeo pueden ser dos razones: falto
//    cargar o ese gasto no es nuestro. Pero la tarjeta se va a pagar tal como marque el resumen, despues
//    tendre que hacer un descargo. El pago del resumen ocurre cuando coloco ya se pago, y se imputa el
//    total en la fecha de vencimiento."
//
// Antes, lo unico que bajaba la cuenta era cada compra cargada con la tarjeta (su cuota, el dia del
// vencimiento): un renglon sin linkear era plata que salia del banco y el sistema no descontaba.
//
// Regla nueva, para los resumenes que CIERRAN desde el 1/11/2026 (los anteriores quedan como estaban: se
// cargaron a mano como debitos del vencimiento y aplicarles esto los contaria dos veces):
//   - CUENTAS: las compras con la tarjeta ya NO bajan la cuenta. La baja el resumen, por su TOTAL, el dia
//     del vencimiento, y solo cuando se marca pagado.
//   - CASH FLOW: el total del resumen se reparte. Lo linkeado sigue en el renglon de cada proveedor (eso no
//     cambia); el RESTO sin linkear va a Financieros como "sin linkear". Asi el dia del vencimiento el cash
//     flow suma exactamente lo que dice el resumen.
// Solo pesos: el total en dolares del resumen no se imputa aca.
import { LINKEO_OBLIGATORIO_DESDE } from "./fichaTarjeta";

export const PAGO_RESUMEN_DESDE = LINKEO_OBLIGATORIO_DESDE;

const r2 = (n: number) => Math.round(n * 100) / 100;

export type ResumenParaPago = { id: number; company: string; cardId: number; closingDate: string; dueDate: string; totalArs: number; paid?: boolean };
export type CuotaParaPago = { statementId: number | null; monto: number };

/** El resumen se paga por su total (regla nueva) o lo bajan sus compras una por una (los anteriores). */
export const pagaElTotal = (r: { closingDate?: string } | undefined | null): boolean => !!r && (r.closingDate || "") >= PAGO_RESUMEN_DESDE;

export type RepartoResumen = {
  statementId: number;
  total: number; // lo que dice el resumen (pesos)
  linkeado: number; // compras cargadas con la tarjeta que caen en este resumen (incluye comisiones)
  resto: number; // sin linkear: falto cargar o no es nuestro (descargo pendiente). Nunca negativo.
  deMas: number; // lo cargado supera al resumen: hay algo cargado dos veces o en el resumen equivocado
  pagado: boolean;
  fecha: string; // cuando se imputa: el vencimiento (o el cierre si no tiene)
};

/** El reparto de cada resumen de la regla nueva, por id. */
export function repartoDeResumenes(resumenes: ResumenParaPago[], cuotas: CuotaParaPago[]): Map<number, RepartoResumen> {
  const linkeado = new Map<number, number>();
  cuotas.forEach((q) => {
    if (q.statementId == null) return;
    linkeado.set(q.statementId, (linkeado.get(q.statementId) || 0) + Number(q.monto || 0));
  });
  const out = new Map<number, RepartoResumen>();
  resumenes.filter(pagaElTotal).forEach((r) => {
    const total = r2(Number(r.totalArs || 0));
    const link = r2(linkeado.get(r.id) || 0);
    out.set(r.id, {
      statementId: r.id,
      total,
      linkeado: link,
      resto: r2(Math.max(0, total - link)),
      deMas: r2(Math.max(0, link - total)),
      pagado: !!r.paid,
      fecha: r.dueDate || r.closingDate || "",
    });
  });
  return out;
}

/** La cuota de una compra con tarjeta baja la cuenta SOLO si su resumen es de los anteriores. */
export const cuotaBajaLaCuenta = (q: { statementId: number | null }, resumenPorId: Map<number, { closingDate?: string }>): boolean =>
  q.statementId == null || !pagaElTotal(resumenPorId.get(q.statementId));

/** Los pagos de resumen que mueven una cuenta: los marcados pagados, por su total, en el vencimiento. */
export function pagosDeResumenes(reparto: Map<number, RepartoResumen>): RepartoResumen[] {
  return Array.from(reparto.values()).filter((r) => r.pagado && r.total > 0 && !!r.fecha);
}
