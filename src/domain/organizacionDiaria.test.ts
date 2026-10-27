import {
  avisosDelDia,
  comoSePaga,
  franjasPorLugar,
  genteJuntaPorLugar,
  horasDelDia,
  linkMapa,
  minutosReales,
  turnoExtraSiguiente,
  turnosPorDefecto,
} from "./organizacionDiaria";

describe("organizacion diaria", () => {
  it("turnos de siempre: manana 07:30-13:30 y tarde 14:00-17:00 (almuerzo en el medio); sabado solo manana", () => {
    expect(turnosPorDefecto("2026-10-22").map((t) => `${t.desde}-${t.hasta}`)).toEqual(["07:30-13:30", "14:00-17:00"]);
    expect(turnosPorDefecto("2026-10-24").map((t) => `${t.desde}-${t.hasta}`)).toEqual(["07:00-13:00"]);
    expect(turnosPorDefecto("2026-10-25")).toEqual([]);
  });

  it("el turno extra sigue al ultimo: hasta las 21 al 50%; despues, nocturno", () => {
    expect(turnoExtraSiguiente(turnosPorDefecto("2026-10-22"))).toMatchObject({ desde: "17:00", hasta: "21:00", nombre: "Extra" });
    expect(turnoExtraSiguiente([{ id: "x", nombre: "Extra", desde: "17:00", hasta: "21:00" }])).toMatchObject({ desde: "21:00", nombre: "Noche" });
  });

  it("clasifica las horas con la misma regla que la liquidacion", () => {
    expect(comoSePaga("2026-10-22", "17:00", "21:00")).toBe("4 h extra 50%");
    expect(comoSePaga("2026-10-22", "21:00", "23:00")).toBe("2 h nocturna 50%");
    const dia = horasDelDia({ fecha: "2026-10-22", turnos: turnosPorDefecto("2026-10-22") });
    expect(dia.normalHours).toBe(9); // 07:30-17:00 menos la media hora de almuerzo
  });

  it("avisa tareas que se pisan o que caen fuera de los turnos", () => {
    const avisos = avisosDelDia({
      turnos: turnosPorDefecto("2026-10-22"),
      tareas: [
        { id: 1, descripcion: "Cortar", desde: "08:00", hasta: "10:00" },
        { id: 2, descripcion: "Enchapar", desde: "09:30", hasta: "11:00" },
        { id: 3, descripcion: "Pintar", desde: "18:00", hasta: "19:00" },
      ],
    });
    expect(avisos).toEqual(['"Cortar" y "Enchapar" se pisan', '"Pintar" (18:00-19:00) cae fuera de los turnos']);
  });

  it("tiempo real de una tarea: del inicio a cuando se marco hecha", () => {
    const hecha = new Date(2026, 9, 22, 10, 15).toISOString();
    expect(minutosReales({ desde: "08:00", hechaEn: hecha }, "2026-10-22")).toBe(135);
    expect(minutosReales({ desde: "08:00" }, "2026-10-22")).toBeNull();
  });

  it("cuantas personas hay juntas en cada lugar", () => {
    const base = { company: "BGA", fecha: "2026-10-22", tareas: [] as any[] };
    const franjas = franjasPorLugar(
      [
        { ...base, id: 1, empleadoId: 1, empleado: "Ana", lugar: "fabrica", turnos: turnosPorDefecto("2026-10-22") },
        { ...base, id: 2, empleadoId: 2, empleado: "Beto", lugar: "obra", jobId: 7, turnos: [{ id: "m", nombre: "Mañana", desde: "07:30", hasta: "13:30" }] },
        { ...base, id: 3, empleadoId: 3, empleado: "Caro", lugar: "obra", jobId: 7, turnos: [{ id: "m", nombre: "Mañana", desde: "10:00", hasta: "13:30" }] },
      ],
      (id) => `Obra ${id}`
    );
    expect(genteJuntaPorLugar(franjas)).toEqual([
      { lugarKey: "fabrica", lugarLabel: "Fábrica", personas: ["Ana"], maximoJuntos: 1 },
      { lugarKey: "obra:7", lugarLabel: "Obra 7", personas: ["Beto", "Caro"], maximoJuntos: 2 },
    ]);
  });

  it("link a Google Maps con la direccion de la obra", () => {
    expect(linkMapa("Av. Libertador 1000, CABA")).toBe("https://www.google.com/maps/search/?api=1&query=Av.%20Libertador%201000%2C%20CABA");
    expect(linkMapa("")).toBeNull();
  });
});

describe("máquinas y herramientas elegidas en la tarea", () => {
  const { conHerramientasDeLaTarea } = require("./organizacionDiaria");
  it("cada paso pide las herramientas de su tarea además de las propias", () => {
    const pasos = [{ id: 1, nombre: "Cargar placa", herramientas: [7] }, { id: 2, nombre: "Iniciar corte" }, { id: 3, nombre: "Suelto" }] as any[];
    const grupos = [{ id: 10, nombre: "Corte CNC", tareaIds: [1, 2], herramientas: [5, 7] }];
    const r = conHerramientasDeLaTarea(pasos, grupos);
    expect(r[0].herramientas).toEqual([7, 5]);
    expect(r[1].herramientas).toEqual([5, 7]);
    expect(r[2].herramientas).toBeUndefined();
  });
});
