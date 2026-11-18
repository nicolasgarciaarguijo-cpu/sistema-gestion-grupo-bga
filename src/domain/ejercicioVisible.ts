// QUE SE VE DE CADA EJERCICIO (Nicolas, 18/11/2026).
//
// "Quiero que todo lo del ejercicio anterior no se visualice y quede guardado en el ejercicio anterior;
//  si quiero verlo tengo que volver ese ejercicio para verlo. El ejercicio anterior tuvo mucha prueba y
//  no es real; a partir de este estamos trabajando con todo lo real."
//
// La regla es de VISTA, no de calculo. El ejercicio elegido decide que LISTADOS se ven; los numeros
// (saldos, cuenta corriente, deuda, cadena de saldos) se siguen calculando con todo lo cargado, porque
// si no cambiarian al esconder algo -- y Nicolas pidio expresamente que no cambie nada.
//
// Por eso este modulo NO filtra nada que alimente un total: solo sirve para armar la lista que se muestra.
// Funciones puras, fechas ISO comparadas como texto.
import { fiscalYearBounds } from "./fiscalYear";

export type RangoEjercicio = { startIso: string; endIso: string };

// Limites del ejercicio elegido. Es fiscalYearBounds, con nombre propio para que se lea en las solapas.
export function rangoDelEjercicio(startMonth: number, startYear: number): RangoEjercicio {
  return fiscalYearBounds(startMonth, startYear);
}

// True si la fecha cae DENTRO del ejercicio. Una fila sin fecha (o con fecha inservible) se considera
// del ejercicio: no se puede probar que sea vieja, y esconderla seria perderla sin aviso.
export function esDelEjercicio(fecha: string | null | undefined, rango: RangoEjercicio): boolean {
  const d = String(fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return true;
  return d >= rango.startIso && d <= rango.endIso;
}

// La lista que se muestra. `fecha` dice de donde sacar la fecha de cada fila.
export function soloDelEjercicio<T>(items: T[], fecha: (x: T) => string | null | undefined, rango: RangoEjercicio): T[] {
  return items.filter((x) => esDelEjercicio(fecha(x), rango));
}

// Cuantas filas quedan afuera y de que ejercicio. Sirve para el aviso: "hay N de antes del 1/11/2026;
// para verlos, cambiá de ejercicio". Sin esto, esconder seria indistinguible de borrar.
export function escondidasDelEjercicio<T>(
  items: T[],
  fecha: (x: T) => string | null | undefined,
  rango: RangoEjercicio
): { anteriores: number; posteriores: number; total: number } {
  let anteriores = 0;
  let posteriores = 0;
  items.forEach((x) => {
    const d = String(fecha(x) || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    if (d < rango.startIso) anteriores += 1;
    else if (d > rango.endIso) posteriores += 1;
  });
  return { anteriores, posteriores, total: anteriores + posteriores };
}

// True si el ejercicio elegido es el que esta en curso hoy. Con esto la solapa sabe si avisar
// "estas viendo otro ejercicio".
export function esElEjercicioEnCurso(rango: RangoEjercicio, hoyIso: string): boolean {
  const d = hoyIso.slice(0, 10);
  return d >= rango.startIso && d <= rango.endIso;
}
