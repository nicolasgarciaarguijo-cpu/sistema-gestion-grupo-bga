// QUE ALIMENTA EL CALENDARIO ANUAL. Reglas puras de la pieza mas delicada del sistema: decidir si un
// movimiento tiene que entrar al cash flow o si esa misma plata ya entra por otro lado.
//
// El principio (Nicolas, 2026-08-26): TODO alimenta el calendario, pero **cada peso una sola vez**.
// Quien es la fuente de verdad depende del MODO en que este operando el banco (ver mas abajo):
//   - modo CARGA, solo mientras se pone el sistema al dia: manda el extracto, y aparte se suma lo que
//     no deja rastro en el banco (efectivo y negro).
//   - modo CORROBORA, de ahi en mas: manda la carga manual, y el extracto solo verifica que este todo.

// ---- EL BANCO CORROBORA, NO CARGA ------------------------------------------------------------
// Regla de fondo (Nicolas, 2026-08-26): la carga es MANUAL. El extracto bancario existe para
// CONSTATAR que todo lo que paso por la cuenta este cargado en el sistema, no para alimentarlo.
//
// La excepcion es este ejercicio (nov-2025 a oct-2026): como se esta poniendo el sistema al dia con
// meses ya pasados, el extracto SI funciona como carga. Cuando el ejercicio cierre y el proximo
// arranque desde el saldo de cierre, la informacion se va a cargar dia a dia a mano y el banco vuelve
// a su papel: corroborar.
//
// Por eso el modo depende de la FECHA del movimiento, no de una preferencia global: los movimientos
// hasta el cierre del ejercicio de puesta al dia cargan; los de despues solo corroboran. Asi el
// cambio ocurre solo el 1 de noviembre, sin que nadie tenga que acordarse de tocar nada.
export type ModoBanco = "carga" | "corrobora";

export function modoDelBanco(fechaIso: string, cargaHastaIso: string): ModoBanco {
  const fecha = String(fechaIso || "");
  const hasta = String(cargaHastaIso || "");
  // Sin fecha de corte configurada, o sin fecha en el movimiento, el banco carga (comportamiento
  // historico: es lo que venia haciendo antes de que existiera esta regla).
  if (!hasta || !fecha) return "carga";
  return fecha <= hasta ? "carga" : "corrobora";
}

/**
 * ¿Este movimiento del extracto tiene que SUMAR en el calendario?
 *
 * Solo mientras el banco funcione como carga. Pasado el cierre, el movimiento no suma: la plata ya
 * esta en el calendario porque se cargo a mano, y el extracto solo sirve para verificar que asi sea.
 * Contarlo igual duplicaria cada peso.
 */
export function movimientoBancarioAlimenta(fechaIso: string, cargaHastaIso: string): boolean {
  return modoDelBanco(fechaIso, cargaHastaIso) === "carga";
}

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
export function pagoAlimentaCalendario(
  entry: PagoParaCalendario,
  fechaIso: string = "",
  cargaHastaIso: string = ""
): boolean {
  // MODO CORROBORA (el ejercicio ya se carga a mano): el pago cargado ES la fuente de verdad y suma
  // siempre, sin importar como se pago. El movimiento del banco no suma; solo verifica que este.
  if (modoDelBanco(fechaIso, cargaHastaIso) === "corrobora") {
    // Lo unico que sigue afuera es un gasto que ES un movimiento del banco importado: ahi el "pago
    // cargado" y el movimiento son la misma fila, no dos.
    return entry.source !== "extracto";
  }
  // MODO CARGA (puesta al dia): manda el extracto. Solo entra lo que NO paso por el banco, porque lo
  // que paso ya llega como debito y contarlo aca lo duplicaria.
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
