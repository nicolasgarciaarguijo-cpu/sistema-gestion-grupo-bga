// EL BANCO CONSTATA, NO CARGA.
//
// Decision de Nicolas (2026-08-29): "el banco solo constata. Todo lo anterior queda, pero nunca mas
// vuelve a cargar nada el banco."
//
// Hasta ahora un movimiento del extracto, una vez conciliado a un renglon, ERA la fila del cash
// flow: no habia un gasto aparte que lo respaldara. Por eso el corte no puede ser retroactivo — se
// vaciarian los meses ya cargados. Lo que se corta es de acá en adelante: todo extracto que entre
// desde ahora queda marcado `soloConstata` y NO alimenta el Calendario. Sigue sirviendo para lo que
// tiene que servir: verificar que el saldo cierre y que lo que dice el sistema exista en el banco.
//
// IMPORTANTE: `soloConstata` NO saca al movimiento del calculo del SALDO bancario. El saldo se sigue
// tomando del extracto (es el unico lugar donde vive la verdad del banco); lo que deja de pasar es
// que el movimiento se convierta en un renglon de la planilla.

export type BankFeedEntry = { soloConstata?: boolean };

/** true si este movimiento del extracto puede convertirse en un renglon del Calendario anual. */
export function alimentaElCalendario(entry: BankFeedEntry | undefined | null): boolean {
  return !!entry && !entry.soloConstata;
}

/** Marca que se le pone a TODO extracto importado de ahora en mas. */
export const MARCA_SOLO_CONSTATA = { soloConstata: true as const };
