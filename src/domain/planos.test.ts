import {
  planoFileCount,
  getPlanoLevel,
  daysUntil,
  getPlanoSemaphore,
  isPlanoPending,
  comparePlanoUrgency,
} from "./planos";

const plano = (name: string) => ({ id: 1, kind: "plano" as const, name });
const ref = (name: string) => ({ id: 2, kind: "referencia" as const, name });

describe("planos", () => {
  test("planoFileCount cuenta solo planos", () => {
    expect(planoFileCount({ workFiles: [] })).toBe(0);
    expect(planoFileCount({ workFiles: [ref("a.pdf")] })).toBe(0);
    expect(planoFileCount({ workFiles: [plano("a.dwg"), ref("b.pdf"), plano("c.3dm")] })).toBe(2);
  });

  test("getPlanoLevel: sin / proceso / listo", () => {
    expect(getPlanoLevel({ workFiles: [] })).toBe("sin");
    expect(getPlanoLevel({ workFiles: [plano("a.dwg")] })).toBe("proceso");
    // confirmado => listo aunque no cambie la cantidad de archivos
    expect(getPlanoLevel({ workFiles: [plano("a.dwg")], planosConfirmedAt: "2026-07-10" })).toBe("listo");
    // confirmado sin archivos (caso raro) igual cuenta como listo
    expect(getPlanoLevel({ workFiles: [], planosConfirmedAt: "2026-07-10" })).toBe("listo");
  });

  test("daysUntil", () => {
    expect(daysUntil("2026-07-20", "2026-07-10")).toBe(10);
    expect(daysUntil("2026-07-05", "2026-07-10")).toBe(-5);
    expect(daysUntil("", "2026-07-10")).toBeNull();
  });

  test("getPlanoSemaphore: tono por estado y overdue por fecha de inicio", () => {
    const hoy = "2026-07-10";
    const sin = getPlanoSemaphore(
      { workFiles: [], startDate: "2026-07-20", executionStatus: "pendiente" },
      hoy
    );
    expect(sin.tone).toBe("red");
    expect(sin.level).toBe("sin");
    expect(sin.daysToStart).toBe(10);
    expect(sin.overdue).toBe(false);

    const proceso = getPlanoSemaphore(
      { workFiles: [plano("a.dwg")], startDate: "2026-07-08", executionStatus: "en_curso" },
      hoy
    );
    expect(proceso.tone).toBe("yellow");
    expect(proceso.level).toBe("proceso");
    expect(proceso.overdue).toBe(true); // inicio de fabricacion ya paso y no esta confirmado

    const listo = getPlanoSemaphore(
      { workFiles: [plano("a.dwg")], planosConfirmedAt: "2026-07-09", startDate: "2026-07-08", executionStatus: "en_curso" },
      hoy
    );
    expect(listo.tone).toBe("green");
    expect(listo.overdue).toBe(false); // ya esta listo: no es urgente aunque la fecha paso
  });

  test("isPlanoPending: no finalizado y no listo", () => {
    expect(isPlanoPending({ workFiles: [], executionStatus: "pendiente" })).toBe(true);
    expect(isPlanoPending({ workFiles: [plano("a.dwg")], executionStatus: "en_curso" })).toBe(true);
    expect(isPlanoPending({ workFiles: [plano("a.dwg")], planosConfirmedAt: "2026-07-10", executionStatus: "en_curso" })).toBe(false);
    // finalizado no molesta aunque no tenga planos
    expect(isPlanoPending({ workFiles: [], executionStatus: "finalizado" })).toBe(false);
  });

  test("comparePlanoUrgency ordena por dias hasta inicio (vencidos primero, sin fecha al final)", () => {
    const hoy = "2026-07-10";
    const mk = (start: string) =>
      getPlanoSemaphore({ workFiles: [], startDate: start, executionStatus: "pendiente" }, hoy);
    const arr = [mk("2026-07-20"), mk("2026-07-05"), mk(""), mk("2026-07-12")];
    const sorted = [...arr].sort(comparePlanoUrgency).map((s) => s.daysToStart);
    expect(sorted).toEqual([-5, 2, 10, null]);
  });
});
