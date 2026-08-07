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
  it("sábado 07:30-15:00 -> 5.5 normales + 1.5h al 100% (descuenta almuerzo)", () => {
    expect(deriveConvenioHours("2026-08-08", "07:30", "15:00")).toEqual({
      normalHours: 5.5, extra50Hours: 0, extra100Hours: 1.5, night50Hours: 0,
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
});
