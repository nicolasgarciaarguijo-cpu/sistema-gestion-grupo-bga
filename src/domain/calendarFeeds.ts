// QUE ALIMENTA EL CALENDARIO ANUAL. Reglas puras de la pieza mas delicada del sistema: decidir si un
// movimiento tiene que entrar al cash flow o si esa misma plata ya entra por otro lado.
//
// El principio (Nicolas, 2026-08-26): TODO alimenta el calendario, pero **cada peso una sola vez**.
// El extracto bancario es la fuente principal: lo que paso por el banco ya esta ahi. Lo que hay que
// sumar aparte es justamente lo que NO deja rastro en el banco -- el efectivo y el negro.

export type PagoParaCalendario = {
  // "extracto" = el gasto se creo importando el extracto: es literalmente un movimiento del banco.
  source?: string;
  // Debito del extracto con el que quedo conciliado.
  bankEntryId?: number | null;
  // Como se pago. Sin metodo cargado = dato incompleto (se trata como efectivo y se marca con la D).
  paymentMethod?: string;
};

/**
 * ¿Este pago de la solapa Costos tiene que entrar al calendario?
 *
 * Solo si NO paso por el banco. Si salio del banco -- porque se importo del extracto, porque quedo
 * conciliado contra un debito, o porque el medio de pago pasa por la cuenta (transferencia, cheque,
 * debito) -- esa plata YA llega al calendario como debito del extracto, y contarla aca la duplicaria.
 */
export function pagoAlimentaCalendario(entry: PagoParaCalendario): boolean {
  if (entry.source === "extracto") return false;
  if (entry.bankEntryId != null) return false;
  // Mismo criterio que domain/types.ts `saleDelBanco`: cualquier metodo que no sea efectivo pasa por
  // la cuenta. Sin metodo cargado se asume efectivo (y la UI lo marca como dato faltante).
  const metodo = String(entry.paymentMethod || "").trim();
  if (metodo && metodo !== "efectivo") return false;
  return true;
}

/**
 * Lo que sobra de un fondo de caja chica al cerrarlo, y que por lo tanto vuelve a entrar como ingreso.
 *
 * La asignacion del fondo ya salio como egreso (regla del usuario: cuando se le asigna la plata a
 * alguien, se considera gastada). Si al cerrar no se gasto todo, la diferencia tiene que volver o la
 * plata queda gastada sin haberse gastado. Un fondo sobre-rendido (se gasto mas de lo asignado) no
 * devuelve nada: eso es un gasto de mas, no un vuelto.
 */
export function devolucionDeCajaChica(assignedAmount: number, totalRendido: number): number {
  const sobrante = Number(assignedAmount || 0) - Number(totalRendido || 0);
  return sobrante > 0 ? Math.round(sobrante * 100) / 100 : 0;
}

/**
 * Reparto blanco/negro de la asignacion de un fondo. Los fondos viejos no traen el desglose: se toman
 * enteros como blancos, que es como se venian leyendo.
 */
export function repartoDelFondo(fund: {
  assignedAmount: number;
  assignedWhite?: number;
  assignedBlack?: number;
}): { blanco: number; negro: number } {
  const total = Number(fund.assignedAmount || 0);
  const tieneDesglose = fund.assignedWhite != null || fund.assignedBlack != null;
  if (!tieneDesglose) return { blanco: total, negro: 0 };
  return { blanco: Number(fund.assignedWhite || 0), negro: Number(fund.assignedBlack || 0) };
}
