import {
  computeMonthAttendance,
  summarizeMonthAttendance,
  scheduleForDate,
  dayOfWeek,
  deriveConvenioHours,
  WORKSHOP_SCHEDULE,
} from "./attendance";
import type { AttendanceRecord } from "./types";

const rec = (date: string, over: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  date,
  status: "presente",
  normalHours: 8,
  extra50Hours: 0,
  extra100Hours: 0,
  attachmentName: "",
  notes: "",
  ...over,
});

// 2026-08-03 es lunes; 2026-08-08 es sabado; 2026-08-09 es domingo.
describe("scheduleForDate", () => {
  it("lunes a viernes sale 17:00", () => {
    expect(scheduleForDate("2026-08-03")).toEqual({ entry: "07:30", exit: "17:00" });
  });
  it("sabado sale 13:00", () => {
    expect(dayOfWeek("2026-08-08")).toBe(6);
    expect(scheduleForDate("2026-08-08")).toEqual({ entry: "07:30", exit: "13:00" });
  });
  it("domingo no es laborable", () => {
    expect(dayOfWeek("2026-08-09")).toBe(0);
    expect(scheduleForDate("2026-08-09")).toBeNull();
  });
});

describe("computeMonthAttendance", () => {
  it("en horario -> verde", () => {
    const map = computeMonthAttendance([rec("2026-08-03", { checkIn: "07:28" })], "2026-08");
    expect(map.get("2026-08-03")?.level).toBe("green");
  });

  it("tarde mas de 5 min -> amarillo", () => {
    const map = computeMonthAttendance([rec("2026-08-03", { checkIn: "07:40" })], "2026-08");
    const d = map.get("2026-08-03");
    expect(d?.level).toBe("yellow");
    expect(d?.lateMinutes).toBe(10);
  });

  it("dentro de los 5 min: primeras 2 veces verde (tolerado), la 3.a amarillo", () => {
    const map = computeMonthAttendance(
      [
        rec("2026-08-03", { checkIn: "07:33" }),
        rec("2026-08-04", { checkIn: "07:34" }),
        rec("2026-08-05", { checkIn: "07:32" }),
      ],
      "2026-08"
    );
    expect(map.get("2026-08-03")?.level).toBe("green");
    expect(map.get("2026-08-03")?.tolerated).toBe(true);
    expect(map.get("2026-08-04")?.level).toBe("green");
    expect(map.get("2026-08-05")?.level).toBe("yellow"); // ya gasto las 2 tolerancias
  });

  it("ausente -> rojo", () => {
    const map = computeMonthAttendance(
      [rec("2026-08-03", { status: "ausente_injustificado" })],
      "2026-08"
    );
    expect(map.get("2026-08-03")?.level).toBe("red");
  });

  it("presente sin hora de entrada -> verde (no se puede medir tardanza)", () => {
    const map = computeMonthAttendance([rec("2026-08-03")], "2026-08");
    expect(map.get("2026-08-03")?.level).toBe("green");
  });

  it("sin_cargar no marca nada", () => {
    const map = computeMonthAttendance([rec("2026-08-03", { status: "sin_cargar" })], "2026-08");
    expect(map.has("2026-08-03")).toBe(false);
  });

  it("respeta la config de tolerancia", () => {
    expect(WORKSHOP_SCHEDULE.toleranceMinutes).toBe(5);
    expect(WORKSHOP_SCHEDULE.toleranceMaxPerMonth).toBe(2);
  });
});

describe("summarizeMonthAttendance", () => {
  it("cuenta presente / tarde / tolerado / ausente", () => {
    const s = summarizeMonthAttendance(
      [
        rec("2026-08-03", { checkIn: "07:20" }), // en horario
        rec("2026-08-04", { checkIn: "07:33" }), // tolerado 1
        rec("2026-08-05", { checkIn: "07:34" }), // tolerado 2
        rec("2026-08-06", { checkIn: "07:33" }), // amarillo (sin tolerancias)
        rec("2026-08-07", { checkIn: "08:10" }), // amarillo
        rec("2026-08-10", { status: "ausente_injustificado" }), // rojo
      ],
      "2026-08"
    );
    expect(s.present).toBe(5);
    expect(s.onTime).toBe(3); // 1 en horario + 2 tolerados siguen "en horario" (verde)
    expect(s.toleratedLates).toBe(2);
    expect(s.late).toBe(2);
    expect(s.absent).toBe(1);
  });
});

// 2026-08-03 lunes, 2026-08-08 sábado, 2026-08-09 domingo.
describe("deriveConvenioHours (precarga desde entrada/salida)", () => {
  it("día hábil 07:30-17:00 -> 9h normales (descuenta 30' de almuerzo), sin extra", () => {
    expect(deriveConvenioHours("2026-08-03", "07:30", "17:00")).toEqual({
      normalHours: 9, extra50Hours: 0, extra100Hours: 0, night50Hours: 0,
    });
  });
  it("día hábil con extra diurno 07:30-19:00 -> 9h normales + 2h extra 50", () => {
    expect(deriveConvenioHours("2026-08-03", "07:30", "19:00")).toEqual({
      normalHours: 9, extra50Hours: 2, extra100Hours: 0, night50Hours: 0,
    });
  });
  it("día hábil con nocturnidad 07:30-22:00 -> 9h + 4h extra 50 + 1h nocturna 50", () => {
    expect(deriveConvenioHours("2026-08-03", "07:30", "22:00")).toEqual({
      normalHours: 9, extra50Hours: 4, extra100Hours: 0, night50Hours: 1,
    });
  });
  it("almuerzo no computa: 07:30-14:30 -> 6.5h (7h menos 30' de almuerzo)", () => {
    expect(deriveConvenioHours("2026-08-03", "07:30", "14:30")).toEqual({
      normalHours: 6.5, extra50Hours: 0, extra100Hours: 0, night50Hours: 0,
    });
  });
  // SABADO (criterio de Nicolas, 2026-08-31): no hay horas normales. Hasta las 13 va al 50% y de ahi
  // en adelante al 100%.
  it("sábado 07:30-15:00 -> 5.5h al 50% + 1.5h al 100% (descuenta almuerzo), sin horas normales", () => {
    expect(deriveConvenioHours("2026-08-08", "07:30", "15:00")).toEqual({
      normalHours: 0, extra50Hours: 5.5, extra100Hours: 1.5, night50Hours: 0,
    });
  });
  it("sábado 07:00-13:00 -> las 6 horas al 50%", () => {
    expect(deriveConvenioHours("2026-08-08", "07:00", "13:00")).toEqual({
      normalHours: 0, extra50Hours: 6, extra100Hours: 0, night50Hours: 0,
    });
  });
  it("sábado 13:00-20:00 -> todo al 100% (el almuerzo igual no computa)", () => {
    expect(deriveConvenioHours("2026-08-08", "13:00", "20:00")).toEqual({
      normalHours: 0, extra50Hours: 0, extra100Hours: 6.5, night50Hours: 0,
    });
  });
  it("domingo 08:00-12:00 -> 4h al 100%", () => {
    expect(deriveConvenioHours("2026-08-09", "08:00", "12:00")).toEqual({
      normalHours: 0, extra50Hours: 0, extra100Hours: 4, night50Hours: 0,
    });
  });
  it("sin salida -> todo en cero (no precarga)", () => {
    expect(deriveConvenioHours("2026-08-03", "07:30", undefined)).toEqual({
      normalHours: 0, extra50Hours: 0, extra100Hours: 0, night50Hours: 0,
    });
  });

  it("feriado nacional en dia habil trabajado -> TODO al 100% (Ano Nuevo, jueves)", () => {
    // 2026-01-01 es jueves habil, pero es feriado: no hay horas normales, todo va al 100%.
    expect(deriveConvenioHours("2026-01-01", "07:30", "13:00")).toEqual({
      normalHours: 0, extra50Hours: 0, extra100Hours: 5.5, night50Hours: 0,
    });
  });
  it("dia habil NO feriado mismo horario -> horas normales (contraste)", () => {
    // 2026-01-02 es viernes habil normal: 07:30-13:00 son horas normales.
    expect(deriveConvenioHours("2026-01-02", "07:30", "13:00")).toEqual({
      normalHours: 5.5, extra50Hours: 0, extra100Hours: 0, night50Hours: 0,
    });
  });
  it("override manual feriado=true fuerza el 100% aunque la fecha no sea feriado nacional", () => {
    expect(deriveConvenioHours("2026-08-03", "07:30", "13:00", true)).toEqual({
      normalHours: 0, extra50Hours: 0, extra100Hours: 5.5, night50Hours: 0,
    });
  });
});

describe("feriados y fines de semana se marcan solos", () => {
  it("un mes sin nada cargado ya trae sus fines de semana y feriados", () => {
    // Agosto 2026: el 17 (San Martin) cae lunes y es feriado.
    const dias = computeMonthAttendance([], "2026-08");
    expect(dias.get("2026-08-17")?.offKind).toBe("feriado");
    expect(dias.get("2026-08-29")?.offKind).toBe("fin_de_semana"); // sabado
    expect(dias.get("2026-08-30")?.offKind).toBe("fin_de_semana"); // domingo
    expect(dias.get("2026-08-28")).toBeUndefined(); // viernes habil sin cargar: no se toca
  });

  it("lo cargado a mano gana sobre lo automatico", () => {
    // Un sabado que SI se trabajo se carga presente y no queda como fin de semana.
    const dias = computeMonthAttendance(
      [{ date: "2026-08-29", status: "presente", normalHours: 0, extra50Hours: 5, extra100Hours: 0, attachmentName: "", notes: "" } as any],
      "2026-08"
    );
    expect(dias.get("2026-08-29")?.level).toBe("green");
  });

  it("no cuentan como ausencia ni se mezclan con vacaciones", () => {
    const r = summarizeMonthAttendance(
      [{ date: "2026-08-03", status: "vacaciones", normalHours: 0, extra50Hours: 0, extra100Hours: 0, attachmentName: "", notes: "" } as any],
      "2026-08"
    );
    expect(r.absent).toBe(0);
    expect(r.vacations).toBe(1);
    expect(r.feriados).toBe(1);          // el 17
    expect(r.finesDeSemana).toBe(10);    // agosto 2026 tiene 10 dias de fin de semana
  });
});
