// Semaforo de asistencia. Regla de negocio del taller (ver memoria horario-laboral-asistencia):
//   - Horario: L-V 07:30 a 17:00, Sabados 07:30 a 13:00, Domingo no laborable.
//   - Verde  = presente y en horario (ficho <= 07:30).
//   - Tolerancia: 5 min de gracia, PERO maximo 2 veces al mes. Fichar 07:31-07:35 sigue verde solo
//     las primeras 2 veces del mes; de la 3.a en adelante -> amarillo.
//   - Amarillo = presente pero tarde (ficho > 07:35, o dentro de los 5 min con las 2 tolerancias ya
//     usadas ese mes).
//   - Rojo = ausente (justificado o injustificado).
// El horario es global (igual para todos). Si mas adelante hay turnos por empleado, se parametriza.

import type { AttendanceRecord } from "./types";
import { mapaDeFeriados, esFinDeSemana, esFeriado } from "./feriadosArgentina";

export const WORKSHOP_SCHEDULE = {
  entry: "07:30",
  exitWeekday: "17:00",
  exitSaturday: "13:00",
  toleranceMinutes: 5,
  toleranceMaxPerMonth: 2,
};

export type AttendanceLevel =
  | "green" // presente en horario
  | "yellow" // presente tarde
  | "red" // ausente
  | "off" // dia no laborable (domingo) o vacaciones
  | "none"; // dia laborable sin dato cargado

export type DayAttendance = {
  level: AttendanceLevel;
  // Por que el dia no cuenta (solo cuando level === "off"). Sin esto, vacaciones, feriados y fines
  // de semana caian todos en la misma bolsa y el resumen del mes mentia.
  offKind?: "vacaciones" | "feriado" | "fin_de_semana";
  lateMinutes: number; // minutos de tardanza (0 si en horario / sin dato)
  tolerated: boolean; // llego dentro de los 5 min y se le conto una tolerancia del mes
  label: string; // texto corto para tooltip / resumen
};

// "YYYY-MM-DD" -> dia de la semana en hora LOCAL (0=Domingo ... 6=Sabado). Se parsea a mano para no
// sufrir el corrimiento de zona horaria de new Date("YYYY-MM-DD") (que interpreta UTC).
export const dayOfWeek = (dateKey: string): number => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1).getDay();
};

export const isWorkday = (dateKey: string): boolean => dayOfWeek(dateKey) !== 0;

// Horario esperado para una fecha. null = dia no laborable (domingo).
export const scheduleForDate = (dateKey: string): { entry: string; exit: string } | null => {
  const dow = dayOfWeek(dateKey);
  if (dow === 0) return null;
  if (dow === 6) return { entry: WORKSHOP_SCHEDULE.entry, exit: WORKSHOP_SCHEDULE.exitSaturday };
  return { entry: WORKSHOP_SCHEDULE.entry, exit: WORKSHOP_SCHEDULE.exitWeekday };
};

// "HH:MM" -> minutos desde medianoche. null si no parsea.
export const timeToMinutes = (hhmm?: string): number | null => {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

// Semaforo de un MES para un empleado. Procesa los dias en orden cronologico para poder aplicar la
// regla de "2 tolerancias por mes". Devuelve un mapa fecha -> estado del dia. `month` = "YYYY-MM".
export const computeMonthAttendance = (
  attendance: AttendanceRecord[],
  month: string
): Map<string, DayAttendance> => {
  const out = new Map<string, DayAttendance>();
  const rows = attendance
    .filter((r) => r.date.startsWith(`${month}-`))
    .sort((a, b) => a.date.localeCompare(b.date));
  let tolerancesUsed = 0;

  for (const r of rows) {
    if (r.status === "ausente_injustificado" || r.status === "ausente_justificado") {
      out.set(r.date, {
        level: "red",
        lateMinutes: 0,
        tolerated: false,
        label: r.status === "ausente_justificado" ? "Ausente justificado" : "Ausente",
      });
      continue;
    }
    if (r.status === "vacaciones") {
      out.set(r.date, { level: "off", offKind: "vacaciones", lateMinutes: 0, tolerated: false, label: "Vacaciones" });
      continue;
    }
    // Feriado y fin de semana NO son ausencia: nadie tenia que fichar. No cuentan para el
    // presentismo ni para nada. Si igual se trabajo, el dia se carga como "presente" y las horas se
    // liquidan como extra segun la franja (ver deriveConvenioHours).
    if (r.status === "feriado" || r.status === "fin_de_semana") {
      out.set(r.date, {
        level: "off",
        offKind: r.status === "feriado" ? "feriado" : "fin_de_semana",
        lateMinutes: 0,
        tolerated: false,
        label: r.status === "feriado" ? "Feriado" : "Fin de semana",
      });
      continue;
    }
    if (r.status !== "presente") continue; // sin_cargar: no marca nada

    const sched = scheduleForDate(r.date);
    const entryMin = sched ? timeToMinutes(sched.entry) : null;
    const inMin = timeToMinutes(r.checkIn);

    // Presente sin hora de entrada (o dia no laborable): lo damos por presente en verde, sin poder
    // medir tardanza.
    if (inMin == null || entryMin == null) {
      out.set(r.date, {
        level: "green",
        lateMinutes: 0,
        tolerated: false,
        label: r.checkIn ? `Presente ${r.checkIn}` : "Presente",
      });
      continue;
    }

    const late = inMin - entryMin;
    if (late <= 0) {
      out.set(r.date, { level: "green", lateMinutes: 0, tolerated: false, label: `En horario (${r.checkIn})` });
      continue;
    }
    if (late <= WORKSHOP_SCHEDULE.toleranceMinutes) {
      if (tolerancesUsed < WORKSHOP_SCHEDULE.toleranceMaxPerMonth) {
        tolerancesUsed += 1;
        out.set(r.date, {
          level: "green",
          lateMinutes: late,
          tolerated: true,
          label: `Tolerancia ${tolerancesUsed}/${WORKSHOP_SCHEDULE.toleranceMaxPerMonth} (${r.checkIn}, +${late}')`,
        });
      } else {
        out.set(r.date, {
          level: "yellow",
          lateMinutes: late,
          tolerated: false,
          label: `Tarde ${r.checkIn} (+${late}', sin tolerancias)`,
        });
      }
      continue;
    }
    out.set(r.date, {
      level: "yellow",
      lateMinutes: late,
      tolerated: false,
      label: `Tarde ${r.checkIn} (+${late}')`,
    });
  }

  // Y los dias que NO son laborables se marcan solos, sin que nadie los cargue: salen del calendario
  // argentino (feriados calculados por año) y del fin de semana. Solo se completan los dias que no
  // tienen nada cargado -- lo que se haya cargado a mano manda siempre.
  const [y, m] = month.split("-").map(Number);
  if (y && m) {
    const feriados = mapaDeFeriados([y]);
    const ultimo = new Date(y, m, 0).getDate();
    for (let d = 1; d <= ultimo; d += 1) {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (out.has(iso)) continue;
      const fer = feriados.get(iso);
      if (fer) {
        out.set(iso, { level: "off", offKind: "feriado", lateMinutes: 0, tolerated: false, label: fer });
      } else if (esFinDeSemana(iso)) {
        out.set(iso, { level: "off", offKind: "fin_de_semana", lateMinutes: 0, tolerated: false, label: "Fin de semana" });
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------------------------
// PRECARGA de horas del convenio a partir de la entrada/salida (CCT 335/75 muebles, ver marco legal).
// Es una SUGERENCIA editable: el sistema estima, el usuario revisa y ajusta (almuerzo, casos raros).
//
// Reglas acordadas con el usuario:
//   - Jornada normal: L-V 07:30-17:00, Sáb 07:30-13:00 (WORKSHOP_SCHEDULE). Domingo: todo al 100%.
//   - Normales   = tiempo trabajado DENTRO de la ventana de jornada.
//   - Extra 50%  = tiempo fuera de jornada en día hábil (y sábado antes de las 07:30).
//   - Extra 100% = sábado después de 13:00, domingos y feriados.
//   - Nocturnas 50% = franja 21:00-06:00 del tiempo extra (se separa de extra 50 para no duplicar).
//   - Almuerzo 13:30-14:00 (30 min) NO computa: se descuenta del tiempo trabajado antes de clasificar.
export type ConvenioHours = {
  normalHours: number;
  extra50Hours: number;
  extra100Hours: number;
  night50Hours: number;
};

// SABADO: de 07:00 a 13:00 se paga al 50% y de las 13:00 en adelante al 100%. El corte es de PAGO,
// distinto del horario de entrada (07:30) que usa el semaforo de puntualidad: son dos ejes.
export const SABADO_INICIO_50 = 7 * 60; // 07:00
export const SABADO_CORTE_100 = 13 * 60; // 13:00
const NIGHT_START = 21 * 60; // 21:00
const NIGHT_END = 6 * 60; // 06:00
export const LUNCH_START = 13 * 60 + 30; // 13:30
export const LUNCH_END = 14 * 60; // 14:00 — la media hora de almuerzo no computa
const round2 = (n: number) => Math.round(n * 100) / 100;

// Minutos del intervalo [start,end) (end puede pasar de 1440 si cruza medianoche) que caen en franja
// nocturna (>=21:00 o <06:00), evaluando cada día que toca el intervalo.
const nightMinutesIn = (start: number, end: number): number => {
  let night = 0;
  for (let base = Math.floor(start / 1440) * 1440; base < end; base += 1440) {
    const nA = base + NIGHT_START; // 21:00 de ese día
    const nB = base + 1440 + NIGHT_END; // 06:00 del día siguiente
    night += Math.max(0, Math.min(end, nB) - Math.max(start, nA));
  }
  return night;
};

// Minutos de solape entre [s,e) y [ws,we).
const overlap = (s: number, e: number, ws: number, we: number) => Math.max(0, Math.min(e, we) - Math.max(s, ws));

// Clasifica UN tramo contiguo [s,e) (en minutos) en las 4 categorías, en MINUTOS. Sin lógica de
// almuerzo (eso se resuelve afuera partiendo el intervalo). dow = día de la semana (0=Dom..6=Sáb).
// isFeriado: si es feriado, el día entero se paga al 100% (LCT art. 166), como el domingo.
const categorizeMinutes = (dow: number, s: number, e: number, isFeriado = false): ConvenioHours => {
  if (e <= s) return { normalHours: 0, extra50Hours: 0, extra100Hours: 0, night50Hours: 0 };
  const night = nightMinutesIn(s, e);
  if (dow === 0 || isFeriado) {
    // Domingo o feriado: todo al 100%; la parte nocturna se separa como nocturna 50 (informativa).
    return { normalHours: 0, extra50Hours: 0, extra100Hours: e - s - night, night50Hours: night };
  }
  if (dow === 6) {
    // SABADO (criterio de Nicolas, 2026-08-31): el sabado NO tiene horas normales. De 07:00 a 13:00
    // es extra al 50%, y de las 13:00 hasta las 00:00 es al 100%. Antes de las 07:00 se paga tambien
    // al 50% (sigue siendo sabado); la franja nocturna se informa aparte, igual que el domingo.
    const we = SABADO_CORTE_100; // 13:00
    const hasta13 = overlap(s, e, 0, we);
    const desde13 = overlap(s, e, we, 100000);
    const nocturnaDesde13 = Math.min(night, desde13);
    const nocturnaHasta13 = Math.min(Math.max(0, night - nocturnaDesde13), hasta13);
    return {
      normalHours: 0,
      extra50Hours: hasta13 - nocturnaHasta13,
      extra100Hours: desde13 - nocturnaDesde13,
      night50Hours: nocturnaDesde13 + nocturnaHasta13,
    };
  }
  // Día hábil (L-V): normal 07:30-17:00; el resto es extra (nocturno -> nocturna 50, resto -> extra 50).
  const ws = timeToMinutes(WORKSHOP_SCHEDULE.entry)!; // 450
  const we = timeToMinutes(WORKSHOP_SCHEDULE.exitWeekday)!; // 1020
  const normal = overlap(s, e, ws, we);
  const overtime = e - s - normal;
  const nightExtra = Math.min(night, overtime);
  return { normalHours: normal, extra50Hours: overtime - nightExtra, extra100Hours: 0, night50Hours: nightExtra };
};

// Deriva las 4 categorías de horas del convenio para un día, a partir de checkIn/checkOut.
// Descuenta el almuerzo (13:30-14:00) partiendo el tiempo trabajado en dos tramos. Devuelve todo en 0
// si falta algún dato o el rango no es válido.
export const deriveConvenioHours = (
  dateKey: string,
  checkIn?: string,
  checkOut?: string,
  // Feriado: fuerza el día al 100%. Si se omite, se detecta solo con el calendario nacional
  // (esFeriado). Un caller puede pasar true para un feriado de empresa que no está en el calendario.
  feriado?: boolean
): ConvenioHours => {
  const zero: ConvenioHours = { normalHours: 0, extra50Hours: 0, extra100Hours: 0, night50Hours: 0 };
  const inMin = timeToMinutes(checkIn);
  let outMin = timeToMinutes(checkOut);
  if (inMin == null || outMin == null) return zero;
  if (outMin <= inMin) outMin += 1440; // cruzó medianoche
  if (outMin <= inMin) return zero;

  const dow = dayOfWeek(dateKey);
  const isFeriado = feriado ?? esFeriado(dateKey);
  // Tramos trabajados sacando el almuerzo (13:30-14:00): antes y después del hueco.
  const segments: Array<[number, number]> = [
    [inMin, Math.min(outMin, LUNCH_START)],
    [Math.max(inMin, LUNCH_END), outMin],
  ];
  const acc = { normalHours: 0, extra50Hours: 0, extra100Hours: 0, night50Hours: 0 };
  for (const [s, e] of segments) {
    const part = categorizeMinutes(dow, s, e, isFeriado);
    acc.normalHours += part.normalHours;
    acc.extra50Hours += part.extra50Hours;
    acc.extra100Hours += part.extra100Hours;
    acc.night50Hours += part.night50Hours;
  }
  return {
    normalHours: round2(acc.normalHours / 60),
    extra50Hours: round2(acc.extra50Hours / 60),
    extra100Hours: round2(acc.extra100Hours / 60),
    night50Hours: round2(acc.night50Hours / 60),
  };
};

// Resumen del mes para un empleado (para la tabla de abajo del calendario).
export type MonthAttendanceSummary = {
  present: number;
  onTime: number;
  late: number;
  toleratedLates: number;
  absent: number;
  vacations: number;
  feriados: number;
  finesDeSemana: number;
};

export const summarizeMonthAttendance = (
  attendance: AttendanceRecord[],
  month: string
): MonthAttendanceSummary => {
  const days = computeMonthAttendance(attendance, month);
  const summary: MonthAttendanceSummary = {
    present: 0,
    onTime: 0,
    late: 0,
    toleratedLates: 0,
    absent: 0,
    vacations: 0,
    feriados: 0,
    finesDeSemana: 0,
  };
  days.forEach((d) => {
    if (d.level === "green") {
      summary.present += 1;
      summary.onTime += 1;
      if (d.tolerated) summary.toleratedLates += 1;
    } else if (d.level === "yellow") {
      summary.present += 1;
      summary.late += 1;
    } else if (d.level === "red") {
      summary.absent += 1;
    } else if (d.level === "off") {
      if (d.offKind === "feriado") summary.feriados += 1;
      else if (d.offKind === "fin_de_semana") summary.finesDeSemana += 1;
      else summary.vacations += 1;
    }
  });
  return summary;
};
