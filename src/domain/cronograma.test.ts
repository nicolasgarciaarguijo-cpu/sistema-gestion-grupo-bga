import { cronogramaDeTrabajos, diasHabilesEntre, relojDe, tareasPorPersonaYDia, tramosDe } from "./cronograma";
import type { TipoMueble } from "./tiposMueble";
import type { TipoTarea } from "./organizacionDiaria";

// 2026-10-26 es lunes.
describe("calendario del taller", () => {
  it("las horas de trabajo caen en el reloj: 07:30 a 13:30, almuerzo, 14:00 a 17:00, sin fines de semana", () => {
    expect(relojDe("2026-10-26", 0)).toEqual({ fecha: "2026-10-26", hora: "07:30" });
    expect(relojDe("2026-10-26", 6)).toEqual({ fecha: "2026-10-26", hora: "14:00" });
    expect(relojDe("2026-10-26", 8.5)).toEqual({ fecha: "2026-10-26", hora: "16:30" });
    expect(relojDe("2026-10-26", 9)).toEqual({ fecha: "2026-10-27", hora: "07:30" });
    expect(relojDe("2026-10-30", 9)).toEqual({ fecha: "2026-11-02", hora: "07:30" }); // viernes + 1 dia = lunes
    expect(relojDe("2026-10-31", 0).fecha).toBe("2026-11-02"); // arrancar un sabado = el lunes
  });

  it("un tramo se parte en el almuerzo y al cierre del dia", () => {
    expect(tramosDe("2026-10-26", 5, 11)).toEqual([
      { fecha: "2026-10-26", desde: "12:30", hasta: "13:30" },
      { fecha: "2026-10-26", desde: "14:00", hasta: "17:00" },
      { fecha: "2026-10-27", desde: "07:30", hasta: "09:30" },
    ]);
  });

  it("dias habiles entre dos fechas", () => {
    expect(diasHabilesEntre("2026-10-26", "2026-10-28")).toBe(2);
    expect(diasHabilesEntre("2026-10-30", "2026-11-02")).toBe(1);
    expect(diasHabilesEntre("2026-11-02", "2026-10-30")).toBe(-1);
  });
});

describe("cronograma de los trabajos", () => {
  const tareas: TipoTarea[] = [{ id: 1, nombre: "Cortar", unidad: "u", horasEstimadas: 9 }];
  const tipo: TipoMueble = { id: 1, nombre: "Alacena", receta: [{ id: 11, tareaId: 1, paso: 1, factor: 1, base: "u" }] };
  const ana = { id: 1, nombre: "Ana", costoHora: 9000, tareas: [1] };

  it("cada trabajo arranca en su inicio, comparte la gente y dice si llega con la holgura", () => {
    const r = cronogramaDeTrabajos(
      [
        { jobId: 10, nombre: "Uno", inicio: "2026-10-26", entrega: "2026-11-20", muebles: [{ id: 1, tipoMuebleId: 1, cantidad: 1 }], materiales: [] },
        { jobId: 20, nombre: "Dos", inicio: "2026-10-26", entrega: "2026-10-28", holguraDias: 2, muebles: [{ id: 2, tipoMuebleId: 1, cantidad: 2 }], materiales: [] },
      ],
      [tipo], tareas, [], [ana], "2026-10-26"
    );
    const dos = r.trabajos.find((t) => t.jobId === 20)!;
    const uno = r.trabajos.find((t) => t.jobId === 10)!;
    // Ana hace primero el de mas horas (Dos, 18 hs: lunes y martes) y despues Uno (miercoles).
    expect(dos.fin).toBe("2026-10-27");
    expect(dos).toMatchObject({ margenDias: 1, estado: "justo" });
    expect(uno.fin).toBe("2026-10-28");
    expect(uno.estado).toBe("llega");
    const dias = tareasPorPersonaYDia(r.base, uno.asignaciones, () => "alacena");
    expect(dias).toEqual([{ personaId: 1, fecha: "2026-10-28", desde: "07:30", hasta: "13:30", descripcion: "Cortar · alacena", tareaId: 1 }, { personaId: 1, fecha: "2026-10-28", desde: "14:00", hasta: "17:00", descripcion: "Cortar · alacena", tareaId: 1 }]);
  });

  it("un trabajo que arranca mas adelante no empieza antes", () => {
    const r = cronogramaDeTrabajos(
      [{ jobId: 1, nombre: "X", inicio: "2026-11-02", muebles: [{ id: 1, tipoMuebleId: 1, cantidad: 1 }], materiales: [] }],
      [tipo], tareas, [], [ana], "2026-10-26"
    );
    expect(r.trabajos[0]).toMatchObject({ fin: "2026-11-02", estado: "sin_entrega" });
  });

  it("las horas de retrabajo corren el fin del trabajo", () => {
    const sin = cronogramaDeTrabajos([{ jobId: 1, nombre: "X", inicio: "2026-10-26", muebles: [{ id: 1, tipoMuebleId: 1, cantidad: 1 }], materiales: [] }], [tipo], tareas, [], [ana], "2026-10-26");
    const con = cronogramaDeTrabajos([{ jobId: 1, nombre: "X", inicio: "2026-10-26", horasRetrabajo: 9, muebles: [{ id: 1, tipoMuebleId: 1, cantidad: 1 }], materiales: [] }], [tipo], tareas, [], [ana], "2026-10-26");
    expect(sin.trabajos[0].fin).toBe("2026-10-26");
    expect(con.trabajos[0].fin).toBe("2026-10-27");
  });
});
