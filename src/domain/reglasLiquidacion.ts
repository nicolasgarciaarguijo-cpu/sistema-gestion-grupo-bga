// Las reglas de liquidacion, en palabras, para tenerlas a mano al liquidar (bloque "Reglas de
// liquidacion" de Personal). Se ARMAN con las mismas constantes que usa el calculo: si una regla
// cambia en el codigo, el texto cambia solo y nunca queda una explicacion vieja en pantalla.
import {
  WORKSHOP_SCHEDULE,
  SABADO_CORTE_100,
  LUNCH_START,
  LUNCH_END,
  MIN_JORNADA_MINUTOS,
} from "./attendance";
import { PRESENTISMO_PCT_DEL_BRUTO, porcentajePorAsistencia } from "./presentismo";
import { MULT_EXTRA_50, MULT_EXTRA_100, RECARGO_NOCTURNO } from "./payroll";

export type ReglaSeccion = { titulo: string; reglas: string[] };

// Config de la empresa que tambien define la liquidacion (se carga en Personal, "Base de empleados").
export type ReglasConfig = {
  seniorityPctPerYear?: number;
  unionPct?: number;
  insurancePct?: number;
};

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const sumarMin = (hm: string, delta: number) => {
  const [h, m] = hm.split(":").map(Number);
  return hhmm(h * 60 + m + delta);
};
const num = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(n) || 0);
const mult = (n: number) => `x${num(Math.round(n * 1000) / 1000)}`;

export function reglasDeLiquidacion(config: ReglasConfig = {}): ReglaSeccion[] {
  const S = WORKSHOP_SCHEDULE;
  const tol = S.toleranceMinutes;
  const corte = hhmm(SABADO_CORTE_100);
  const noct50 = MULT_EXTRA_50 * RECARGO_NOCTURNO;
  const noct100 = MULT_EXTRA_100 * RECARGO_NOCTURNO;
  const p = (t: number, a: number) => `${porcentajePorAsistencia(t, a)}%`;

  return [
    {
      titulo: "Horario y llegada",
      reglas: [
        `Lunes a viernes de ${S.entry} a ${S.exitWeekday}. Sábados de ${S.entry} a ${S.exitSaturday}. Domingo no se trabaja.`,
        `Margen de ${tol} minutos: fichar hasta las ${sumarMin(S.entry, tol)} es presente en horario, todas las veces. Desde las ${sumarMin(S.entry, tol + 1)} es llegada tarde.`,
        `El almuerzo (${hhmm(LUNCH_START)} a ${hhmm(LUNCH_END)}) no se paga: se descuenta de las horas del día.`,
      ],
    },
    {
      titulo: "Cómo se reparten las horas del día",
      reglas: [
        `Lunes a viernes: dentro del horario son horas normales; fuera del horario, extras al 50%; entre las 21:00 y las 06:00, nocturnas al 50%.`,
        `Sábado (no es feriado): hasta las ${corte}, extras al 50% (la madrugada antes de las 06:00, nocturna al 50%). Desde las ${corte}, extras al 100%; desde las 21:00, nocturnas al 100%.`,
        `Domingo: todo extras al 100%; de noche, nocturnas al 100%.`,
        `Feriado trabajado: va en su propio renglón "Horas de feriado", pagado al 100%; de noche, nocturnas al 100%.`,
        `Feriado NO trabajado: se carga a mano en "Horas feriado pago NO trabajado" y se paga simple.`,
      ],
    },
    {
      titulo: "Cuánto vale cada hora",
      reglas: [
        `Normal ${mult(1)} · Extra 50% ${mult(MULT_EXTRA_50)} · Extra 100% ${mult(MULT_EXTRA_100)} · Feriado trabajado ${mult(MULT_EXTRA_100)}.`,
        `Nocturna 50% ${mult(noct50)} · Nocturna 100% ${mult(noct100)} (el recargo nocturno es +${num((RECARGO_NOCTURNO - 1) * 100)}%).`,
        `Antigüedad: ${num(config.seniorityPctPerYear ?? 1)}% por año, sobre todas las horas.`,
      ],
    },
    {
      titulo: "Presentismo",
      reglas: [
        `Representa el ${PRESENTISMO_PCT_DEL_BRUTO}% del bruto de las horas normales. Cuánto cobra depende de la asistencia del mes:`,
        `Sin tardes ni faltas: ${p(0, 0)}. 1 tarde: ${p(1, 0)}. 2 tardes: ${p(2, 0)}. 3 o más tardes: ${p(3, 0)}.`,
        `1 ausencia: ${p(0, 1)}. 2 o más ausencias: ${p(0, 2)}. Las ausencias cuentan igual, justificadas o no.`,
        `Si hay tardes y ausencias, manda la peor (no se suman): 1 tarde + 1 ausencia = ${p(1, 1)}.`,
        `Se puede fijar a mano con los botones 25/50/75/100 de la ficha; "Volver a la asistencia" lo deja automático.`,
      ],
    },
    {
      titulo: "Fichadas y carga de horas",
      reglas: [
        `Las horas se calculan solas desde la entrada y la salida del reloj.`,
        `Si falta la salida (o la salida está a menos de ${MIN_JORNADA_MINUTOS} minutos de la entrada), el día no suma horas hasta cargarla a mano en la ficha.`,
        `Editar un día a mano le pone candado: la precarga automática ya no lo pisa.`,
      ],
    },
    {
      titulo: "Descuentos y cierre del mes",
      reglas: [
        `Descuentos de ley sobre el bruto remunerativo: jubilación 11%, ley 19.032 3%, obra social 3%, sindicato ${num(config.unionPct ?? 0)}%, seguro ${num(config.insurancePct ?? 0)}%.`,
        `Los anticipos del mes se restan del neto.`,
        `Para exportar la liquidación (bloque "Liquidación mensual") cada empleado elegido tiene que tener el mes guardado ("Guardar mes" en su ficha).`,
        `Topes legales de horas extra: 30 por mes y 200 por año.`,
      ],
    },
  ];
}
