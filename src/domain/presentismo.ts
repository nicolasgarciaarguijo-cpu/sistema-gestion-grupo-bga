// PRESENTISMO. Criterio de Nicolas (2026-08-31).
//
// El presentismo es el 10% del BRUTO por horas normales, y se cobra entero solo si el empleado
// cumplio con la presencialidad Y con el horario de llegada y salida. Cada falta lo va comiendo:
//
// (Sobre la base: el 31/08/2026 se hablo de "el 10% del neto", pero el neto depende del presentismo
// -- el presentismo entra al bruto, el bruto define el neto -- asi que la cuenta se muerde la cola.
// Nicolas lo confirmo: va sobre el BRUTO, que es lo que el sistema ya hacia.)
//
//   TARDES    1 -> pierde 25% (cobra 75%)   2 -> pierde 50%   3 o mas -> lo pierde todo
//   AUSENTES  1 -> pierde 50%               2 o mas -> lo pierde todo
//
// Los ausentes cuentan IGUAL sean justificados o no: la regla es de presencia, no de motivo.
//
// Cuando concurren las dos cosas manda la PEOR: una tarde (75%) mas un ausente (50%) da 50%. No se
// suman los descuentos -- restar 25 y 50 daria 25% y castigaria dos veces la misma quincena.

export const PRESENTISMO_PCT_DEL_BRUTO = 10;

/** Porcentaje del presentismo que le queda al empleado segun sus tardes y ausencias del mes. */
export function porcentajePorAsistencia(tardes: number, ausentes: number): number {
  const t = Math.max(0, Math.floor(Number(tardes) || 0));
  const a = Math.max(0, Math.floor(Number(ausentes) || 0));
  const porTardes = t >= 3 ? 0 : t === 2 ? 50 : t === 1 ? 75 : 100;
  const porAusentes = a >= 2 ? 0 : a === 1 ? 50 : 100;
  return Math.min(porTardes, porAusentes);
}

export type Presentismo = {
  // Lo que le corresponderia con asistencia perfecta (10% del bruto normal).
  base: number;
  // El porcentaje que efectivamente cobra.
  pct: number;
  // Lo que cobra.
  monto: number;
  // true si el porcentaje lo puso alguien a mano en vez de salir de la asistencia.
  aMano: boolean;
  // Por que da ese porcentaje, para mostrarlo al lado del numero.
  motivo: string;
};

/**
 * Calcula el presentismo del mes.
 * `override` (0..100) lo fija a mano y gana sobre lo que diga la asistencia: hay meses que se
 * arreglan de otra forma y el sistema tiene que poder reflejarlo sin pelear.
 */
export function calcularPresentismo(input: {
  brutoBase: number;
  tardes: number;
  ausentes: number;
  override?: number | null;
}): Presentismo {
  const base = Math.round(((Number(input.brutoBase) || 0) * PRESENTISMO_PCT_DEL_BRUTO) / 100 * 100) / 100;
  const auto = porcentajePorAsistencia(input.tardes, input.ausentes);
  const hayOverride =
    input.override !== undefined && input.override !== null && Number.isFinite(Number(input.override));
  const pct = hayOverride ? Math.min(100, Math.max(0, Number(input.override))) : auto;

  const t = Math.max(0, Math.floor(Number(input.tardes) || 0));
  const a = Math.max(0, Math.floor(Number(input.ausentes) || 0));
  const partes: string[] = [];
  if (t > 0) partes.push(`${t} tarde${t > 1 ? "s" : ""}`);
  if (a > 0) partes.push(`${a} ausente${a > 1 ? "s" : ""}`);
  const motivo = hayOverride
    ? `Puesto a mano${partes.length ? ` (por asistencia daría ${auto}%: ${partes.join(" y ")})` : ""}`
    : partes.length
    ? partes.join(" y ")
    : "Asistencia perfecta";

  return {
    base,
    pct,
    monto: Math.round((base * pct) / 100 * 100) / 100,
    aMano: hayOverride,
    motivo,
  };
}
