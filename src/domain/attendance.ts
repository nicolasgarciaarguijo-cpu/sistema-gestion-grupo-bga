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
      out.set(r.date, { level: "off", lateMinutes: 0, tolerated: false, label: "Vacaciones" });
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
  return out;
};

// Resumen del mes para un empleado (para la tabla de abajo del calendario).
export type MonthAttendanceSummary = {
  present: number;
  onTime: number;
  late: number;
  toleratedLates: number;
  absent: number;
  vacations: number;
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
      summary.vacations += 1;
    }
  });
  return summary;
};
