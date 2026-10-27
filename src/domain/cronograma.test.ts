import { cronogramaDeTrabajos, diasHabilesEntre, horaDeTrabajo, ocupacionDelTaller, relojDe, tareasPorPersonaYDia, tramosDe } from "./cronograma";
import type { TipoMueble } from "./tiposMueble";
import type { AsignacionDiaria, TipoTarea } from "./organizacionDiaria";

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

describe("lo que ya esta ocupado en el taller", () => {
  const tareas: TipoTarea[] = [{ id: 1, nombre: "Cortar", unidad: "u", horasEstimadas: 9, herramientas: [50] }];
  const tipo: TipoMueble = { id: 1, nombre: "Alacena", receta: [{ id: 11, tareaId: 1, paso: 1, factor: 1, base: "u" }] };
  const ana = { id: 1, nombre: "Ana", costoHora: 9000, tareas: [1] };
  const beto = { id: 2, nombre: "Beto", costoHora: 8000, tareas: [1] };
  const trabajo = (muebles: number) => ({ jobId: 7, nombre: "X", inicio: "2026-10-26", muebles: Array.from({ length: muebles }, (_, i) => ({ id: i + 1, tipoMuebleId: 1, cantidad: 1 })), materiales: [] });
  const dia = (fecha: string, extra: Partial<AsignacionDiaria>): AsignacionDiaria => ({ id: 1, company: "De raiz s.r.l", fecha, empleadoId: 1, empleado: "Ana", lugar: "fabrica", turnos: [], tareas: [], ...extra });

  it("la hora del reloj pasa a hora de trabajo (sin almuerzo ni fines de semana)", () => {
    expect(horaDeTrabajo("2026-10-26", "2026-10-26", "07:30")).toBe(0);
    expect(horaDeTrabajo("2026-10-26", "2026-10-26", "13:45")).toBe(6);
    expect(horaDeTrabajo("2026-10-26", "2026-10-26", "17:00")).toBe(9);
    expect(horaDeTrabajo("2026-10-26", "2026-10-27", "08:30")).toBe(10);
    expect(horaDeTrabajo("2026-10-26", "2026-10-31", "08:30")).toBeNull();
    expect(horaDeTrabajo("2026-10-26", "2026-10-23", "08:30")).toBeNull();
  });

  it("un dia en obra corre la tarea al dia siguiente", () => {
    const oc = ocupacionDelTaller("2026-10-26", [dia("2026-10-26", { lugar: "obra" })], [7]);
    const r = cronogramaDeTrabajos([trabajo(1)], [tipo], tareas, [], [ana], "2026-10-26", { ocupadoPersona: oc.ocupadoPersona });
    expect(oc.diasEnObra).toBe(1);
    expect(r.trabajos[0].fin).toBe("2026-10-27");
  });

  it("una tarea cargada a mano corta la del cronograma; las del mismo trabajo no cuentan", () => {
    const d = dia("2026-10-26", { tareas: [{ id: 1, descripcion: "Ordenar", desde: "07:30", hasta: "09:30" }, { id: 2, descripcion: "ya volcada", desde: "09:30", hasta: "17:00", jobId: 7 }] });
    const oc = ocupacionDelTaller("2026-10-26", [d], [7]);
    expect(oc.tareasAMano).toBe(1);
    const r = cronogramaDeTrabajos([trabajo(1)], [tipo], tareas, [], [ana], "2026-10-26", { ocupadoPersona: oc.ocupadoPersona });
    const filas = tareasPorPersonaYDia(r.base, r.trabajos[0].asignaciones, () => "alacena");
    expect(filas.map((f) => `${f.fecha} ${f.desde}-${f.hasta}`)).toEqual(["2026-10-26 09:30-13:30", "2026-10-26 14:00-17:00", "2026-10-27 07:30-09:30"]);
  });

  it("una maquina pesada hace una tarea a la vez, aunque haya gente libre", () => {
    const libre = cronogramaDeTrabajos([trabajo(2)], [tipo], tareas, [], [ana, beto], "2026-10-26");
    expect(libre.trabajos[0].fin).toBe("2026-10-26");
    const r = cronogramaDeTrabajos([trabajo(2)], [tipo], tareas, [], [ana, beto], "2026-10-26", {
      maquinas: [{ id: 50, nombre: "CNC", unidades: 1 }],
      herramientasDeTarea: { 1: [50] },
    });
    expect(r.trabajos[0].fin).toBe("2026-10-27");
  });

  it("el mantenimiento para la maquina; si no anda, la tarea queda trabada", () => {
    const mant = dia("2026-10-26", { empleadoId: 2, tareas: [{ id: 1, descripcion: "Service", desde: "07:30", hasta: "17:00", mantenimiento: { stockItemId: 50 } }] });
    const oc = ocupacionDelTaller("2026-10-26", [mant], [7]);
    const r = cronogramaDeTrabajos([trabajo(1)], [tipo], tareas, [], [ana], "2026-10-26", {
      maquinas: [{ id: 50, nombre: "CNC", unidades: 1, ocupado: oc.ocupadoMaquina[50] }],
      herramientasDeTarea: { 1: [50] },
    });
    expect(r.trabajos[0].fin).toBe("2026-10-27");
    const rota = cronogramaDeTrabajos([trabajo(1)], [tipo], tareas, [], [ana], "2026-10-26", {
      maquinas: [{ id: 50, nombre: "CNC", unidades: 1, noDisponible: "fuera de servicio" }],
      herramientasDeTarea: { 1: [50] },
    });
    expect(rota.trabajos[0].trabadas).toEqual([{ nombre: "Cortar", motivos: ["CNC (fuera de servicio)"] }]);
  });
});
