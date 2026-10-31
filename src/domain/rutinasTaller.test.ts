import {
  completarDiaConRutinas,
  huecosDelDia,
  manoDeObraPorGrupo,
  ordenParaRutina,
  previsionDeRutinas,
  tocaElDia,
  VECES_POR_MES,
  type CandidatoRutina,
  type RutinaTaller,
} from "./rutinasTaller";
import type { AsignacionDiaria } from "./organizacionDiaria";

const gente: CandidatoRutina[] = [
  { id: 1, nombre: "Oficial", company: "De Raiz", costoHora: 9000, ayudante: false, tareas: [50] },
  { id: 2, nombre: "Ayudante caro", company: "De Raiz", costoHora: 7000, ayudante: true, tareas: [] },
  { id: 3, nombre: "Aprendiz", company: "De Raiz", costoHora: 5000, ayudante: true, tareas: [50] },
  { id: 4, nombre: "Medio oficial", company: "De Raiz", costoHora: 6000, ayudante: false },
];
const barrido: RutinaTaller = { id: 10, nombre: "Barrido del taller", frecuencia: "diaria", horas: 0.5 };
const deposito: RutinaTaller = { id: 11, nombre: "Orden del depósito", frecuencia: "semanal", dia: 5, horas: 2, personas: 2 };

describe("rutinas del taller", () => {
  it("la diaria va de lunes a viernes y la semanal solo su día", () => {
    expect(tocaElDia(barrido, "2026-11-02")).toBe(true); // lunes
    expect(tocaElDia(barrido, "2026-11-07")).toBe(false); // sabado
    expect(tocaElDia(deposito, "2026-11-06")).toBe(true); // viernes
    expect(tocaElDia(deposito, "2026-11-05")).toBe(false);
    expect(tocaElDia({ ...barrido, activa: false }, "2026-11-02")).toBe(false);
  });

  it("primero aprendices y ayudantes, y del más económico al más costoso", () => {
    expect(ordenParaRutina(barrido, gente).map((c) => c.id)).toEqual([3, 2, 4, 1]);
  });

  it("con tarea del catálogo, solo los autorizados (si alguno la tiene)", () => {
    expect(ordenParaRutina({ tareaId: 50 }, gente).map((c) => c.id)).toEqual([3, 1]);
    expect(ordenParaRutina({ tareaId: 99 }, gente)).toHaveLength(4);
  });

  it("la previsión usa a las primeras personas del orden", () => {
    const p = previsionDeRutinas([barrido, deposito], gente);
    expect(p.filas[0].quienes).toEqual(["Aprendiz"]);
    expect(p.filas[0].costoMes).toBeCloseTo(0.5 * VECES_POR_MES.diaria * 5000);
    expect(p.filas[1].quienes).toEqual(["Aprendiz", "Ayudante caro"]);
    expect(p.filas[1].costoMes).toBeCloseTo(2 * 2 * VECES_POR_MES.semanal * 6000);
  });

  it("la mano de obra se junta por grupo de costos (sin grupo no llega a Marcadores)", () => {
    const mo = manoDeObraPorGrupo([{ ...barrido, grupoCosto: "Limpieza" }, { ...deposito, grupoCosto: "Limpieza" }, { ...barrido, id: 12, nombre: "Sin grupo" }], gente, "De Raiz");
    expect(mo).toHaveLength(1);
    expect(mo[0]).toMatchObject({ company: "De Raiz", group: "Limpieza", rutinas: ["Barrido del taller", "Orden del depósito"] });
    expect(mo[0].montoMes).toBeCloseTo(0.5 * VECES_POR_MES.diaria * 5000 + 2 * 2 * VECES_POR_MES.semanal * 6000);
  });

  it("los huecos son los turnos menos las tareas", () => {
    const a = { turnos: [{ id: "m", nombre: "M", desde: "07:30", hasta: "13:30" }, { id: "t", nombre: "T", desde: "14:00", hasta: "17:00" }], tareas: [{ id: 1, descripcion: "x", desde: "07:30", hasta: "12:00" }, { id: 2, descripcion: "y", desde: "14:00", hasta: "17:00" }] };
    expect(huecosDelDia(a)).toEqual([[720, 810]]);
  });

  it("completa el día en el último hueco de quien corresponde, sin repetir ni mandar a obra", () => {
    let n = 1000;
    const nuevoId = () => n++;
    const ocupado: AsignacionDiaria = {
      id: 1, company: "De Raiz", fecha: "2026-11-06", empleadoId: 3, empleado: "Aprendiz", lugar: "fabrica",
      turnos: [{ id: "m", nombre: "M", desde: "07:30", hasta: "13:30" }, { id: "t", nombre: "T", desde: "14:00", hasta: "17:00" }],
      tareas: [{ id: 5, descripcion: "Lijar", desde: "07:30", hasta: "13:30" }, { id: 6, descripcion: "Lijar", desde: "14:00", hasta: "16:45" }],
    };
    const enObra: AsignacionDiaria = { ...ocupado, id: 2, empleadoId: 2, empleado: "Ayudante caro", lugar: "obra", tareas: [] };
    const r = completarDiaConRutinas("2026-11-06", [barrido, deposito], gente, [ocupado, enObra], nuevoId);
    // Barrido (media hora): el aprendiz solo tiene 15 min libres; el ayudante esta en obra -> el medio oficial.
    expect(r.puestas[0]).toEqual({ rutinaId: 10, empleado: "Medio oficial", desde: "16:30", hasta: "17:00" });
    // Deposito (2 personas, 2 hs): medio oficial (en su hueco de antes) y oficial.
    expect(r.puestas.filter((p) => p.rutinaId === 11).map((p) => p.empleado)).toEqual(["Medio oficial", "Oficial"]);
    expect(r.puestas[1]).toMatchObject({ desde: "14:30", hasta: "16:30" });
    expect(r.sinHueco).toEqual([]);
    // Volver a completar no duplica.
    const r2 = completarDiaConRutinas("2026-11-06", [barrido, deposito], gente, [ocupado, enObra, ...r.dias], nuevoId);
    expect(r2.puestas).toEqual([]);
    expect(r2.yaEstaban).toBe(2);
  });

  it("avisa cuando nadie tiene lugar y saltea a los que no están", () => {
    const r = completarDiaConRutinas("2026-11-02", [{ ...barrido, horas: 10 }], gente.map((c) => ({ ...c, presencia: c.id === 3 ? "no_esta" : "esta" })), [], () => 1);
    expect(r.sinHueco).toEqual([{ rutinaId: 10, nombre: "Barrido del taller", faltan: 1 }]);
  });
});
