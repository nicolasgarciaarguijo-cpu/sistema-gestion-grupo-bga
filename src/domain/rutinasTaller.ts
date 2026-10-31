// FABRICACION · MANTENIMIENTO, ORDEN Y LIMPIEZA (Nicolas, 30/10/2026). "Trabajos -> tareas con tiempos -> personal
// autorizado; rellena los huecos." Respuestas del 30/10:
// - Son CAPACIDADES de los empleados: todos podrian hacerlo, pero el criterio es del MAS ECONOMICO al mas costoso y
//   empiezan SIEMPRE aprendices y ayudantes.
// - Hay frecuencia DIARIA y SEMANAL.
// - El costo NO va al cash flow, ni al calendario, ni es un egreso nuevo: sirve SOLO para conocer la PREVISION de esos
//   gastos al presupuestar. Los materiales tienen sus facturas; lo que se suma es la MANO DE OBRA, en Marcadores, en el grupo
//   de costos de cada rutina (31/10/2026, ver manoDeObraPorGrupo).
// Una rutina es un trabajo del taller que se repite (limpieza del puesto, barrido, orden del deposito...). Si tiene una
// tarea del catalogo, solo la hacen quienes la tienen en sus categorias (si nadie la tiene todavia, cualquiera). Al
// completar un dia, cada rutina que toca va al hueco libre de la persona que corresponde. Funciones puras.

import { timeToMinutes } from "./attendance";
import { turnosPorDefecto, type AsignacionDiaria, type EstadoPresencia, type TareaDelDia } from "./organizacionDiaria";

export type FrecuenciaRutina = "diaria" | "semanal";
export type RutinaTaller = {
  id: number;
  nombre: string;
  frecuencia: FrecuenciaRutina;
  // Semanal: el dia (1 = lunes ... 6 = sabado). Ausente = viernes.
  dia?: number;
  // Horas cada vez, con la cantidad de personas de abajo.
  horas: number;
  personas?: number;
  // Tarea del catalogo de Fabricacion: dice quien esta autorizado (sus categorias internas).
  tareaId?: number | null;
  // Grupo de Costos donde se suma su mano de obra en Marcadores (Mantenimiento, Limpieza...).
  grupoCosto?: string;
  activa?: boolean;
  notas?: string;
};

export const DIAS_SEMANA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const diaDeRutina = (r: Pick<RutinaTaller, "dia">) => (r.dia && r.dia >= 1 && r.dia <= 6 ? r.dia : 5);
export const textoFrecuencia = (r: Pick<RutinaTaller, "frecuencia" | "dia">) => (r.frecuencia === "semanal" ? `Semanal · ${DIAS_SEMANA[diaDeRutina(r)]}` : "Diaria");

// Diaria = de lunes a viernes; semanal = su dia.
export function tocaElDia(r: RutinaTaller, fecha: string): boolean {
  if (r.activa === false) return false;
  const dow = new Date(`${fecha}T12:00:00`).getDay();
  if (r.frecuencia === "semanal") return dow === diaDeRutina(r);
  return dow >= 1 && dow <= 5;
}

export type CandidatoRutina = {
  id: number;
  nombre: string;
  company: string;
  costoHora: number;
  // Aprendiz o ayudante (por su categoria interna): van siempre primero.
  ayudante: boolean;
  // Ids de las tareas que puede hacer (sus categorias); ausente o vacio = sin categorias cargadas.
  tareas?: number[];
  presencia?: EstadoPresencia;
};

// Quienes pueden hacer la rutina, en el orden en que se les da: aprendices y ayudantes primero, y dentro de cada grupo
// del mas economico al mas costoso.
export function ordenParaRutina(r: Pick<RutinaTaller, "tareaId">, candidatos: CandidatoRutina[]): CandidatoRutina[] {
  const autorizados = r.tareaId != null && candidatos.some((c) => (c.tareas || []).includes(r.tareaId as number))
    ? candidatos.filter((c) => (c.tareas || []).includes(r.tareaId as number))
    : candidatos;
  return [...autorizados].sort((a, b) => Number(b.ayudante) - Number(a.ayudante) || a.costoHora - b.costoHora || a.nombre.localeCompare(b.nombre));
}

// ---- Prevision de costo (solo para presupuestar) ----------------------------------------------------------------
// Veces por mes: 52 semanas / 12 meses; la diaria, 5 por semana.
export const VECES_POR_MES: Record<FrecuenciaRutina, number> = { diaria: (52 * 5) / 12, semanal: 52 / 12 };

export type PrevisionRutina = { rutinaId: number; horasMes: number; costoHora: number; costoMes: number; quienes: string[] };
export type PrevisionTaller = { filas: PrevisionRutina[]; horasMes: number; costoMes: number };

// Cada rutina con las personas que la harian (las primeras del orden) a su costo hora.
export function previsionDeRutinas(rutinas: RutinaTaller[], candidatos: CandidatoRutina[]): PrevisionTaller {
  const filas = rutinas
    .filter((r) => r.activa !== false)
    .map((r) => {
      const n = Math.max(1, Math.round(r.personas || 1));
      const quienes = ordenParaRutina(r, candidatos).slice(0, n);
      const costoHora = quienes.length ? quienes.reduce((s, c) => s + c.costoHora, 0) / quienes.length : 0;
      const horasMes = Math.max(0, Number(r.horas) || 0) * n * VECES_POR_MES[r.frecuencia];
      return { rutinaId: r.id, horasMes, costoHora, costoMes: horasMes * costoHora, quienes: quienes.map((c) => c.nombre) };
    });
  return { filas, horasMes: filas.reduce((s, f) => s + f.horasMes, 0), costoMes: filas.reduce((s, f) => s + f.costoMes, 0) };
}

// A MARCADORES (Nicolas, 31/10/2026): "el costo de limpieza y mantenimiento va a tener facturas asociadas. Lo unico que
// faltaria sumar es la mano de obra por el tiempo que demoran las tareas; eso lo quiero ver reflejado en los marcadores, en
// los grupos de costos pertinentes." Cada rutina dice a que grupo de Costos va su mano de obra; aca se junta por grupo (por
// mes) para sumarla al costo empresarial de ese grupo. La gente es de la empresa que fabrica (De Raiz).
export type ManoDeObraGrupo = { company: string; group: string; horasMes: number; montoMes: number; rutinas: string[] };
export function manoDeObraPorGrupo(rutinas: RutinaTaller[], candidatos: CandidatoRutina[], company: string): ManoDeObraGrupo[] {
  const prev = previsionDeRutinas(rutinas, candidatos);
  const porGrupo = new Map<string, ManoDeObraGrupo>();
  prev.filas.forEach((f) => {
    const r = rutinas.find((x) => x.id === f.rutinaId);
    const group = String(r?.grupoCosto || "").trim();
    if (!r || !group) return;
    const g = porGrupo.get(group) || { company, group, horasMes: 0, montoMes: 0, rutinas: [] };
    g.horasMes += f.horasMes;
    g.montoMes += f.costoMes;
    g.rutinas.push(r.nombre);
    porGrupo.set(group, g);
  });
  return Array.from(porGrupo.values());
}

// ---- Completar los huecos de un dia -----------------------------------------------------------------------------
type Tramo = [number, number];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const mins = (s: string) => timeToMinutes(s) ?? 0;

// Lo libre del dia de una persona: sus turnos menos sus tareas.
export function huecosDelDia(a: Pick<AsignacionDiaria, "turnos" | "tareas">): Tramo[] {
  const ocupado = a.tareas.map((t) => [mins(t.desde), mins(t.hasta)] as Tramo).filter(([x, y]) => y > x).sort((p, q) => p[0] - q[0]);
  const out: Tramo[] = [];
  a.turnos.forEach((tu) => {
    let ini = mins(tu.desde);
    const fin = mins(tu.hasta);
    ocupado.forEach(([x, y]) => {
      if (y <= ini || x >= fin) return;
      if (x > ini) out.push([ini, x]);
      ini = Math.max(ini, y);
    });
    if (fin > ini) out.push([ini, fin]);
  });
  return out;
}

export type ResultadoCompletar = {
  dias: AsignacionDiaria[]; // los dias de personas que cambiaron (para guardar)
  puestas: Array<{ rutinaId: number; empleado: string; desde: string; hasta: string }>;
  sinHueco: Array<{ rutinaId: number; nombre: string; faltan: number }>;
  yaEstaban: number;
};

// Cada rutina que toca ese dia y todavia no esta en la organizacion va al hueco libre de la primera persona del orden
// que este en fabrica y tenga lugar. Va AL FINAL del ultimo hueco donde entra (orden y limpieza cierran el turno), asi
// no traba lo que se organice a la manana.
export function completarDiaConRutinas(
  fecha: string,
  rutinas: RutinaTaller[],
  candidatos: CandidatoRutina[],
  asignaciones: AsignacionDiaria[],
  nuevoId: () => number
): ResultadoCompletar {
  const delDia = new Map<number, AsignacionDiaria>();
  asignaciones.filter((a) => a.fecha === fecha).forEach((a) => delDia.set(a.empleadoId, a));
  const cambiados = new Set<number>();
  const puestas: ResultadoCompletar["puestas"] = [];
  const sinHueco: ResultadoCompletar["sinHueco"] = [];
  let yaEstaban = 0;

  rutinas.filter((r) => tocaElDia(r, fecha)).forEach((r) => {
    const yaPuestas = Array.from(delDia.values()).filter((a) => a.tareas.some((t) => t.rutina?.rutinaId === r.id)).length;
    let faltan = Math.max(1, Math.round(r.personas || 1)) - yaPuestas;
    if (faltan <= 0) {
      yaEstaban++;
      return;
    }
    const duracion = Math.max(15, Math.round((Number(r.horas) || 0) * 60));
    for (const c of ordenParaRutina(r, candidatos)) {
      if (faltan <= 0) break;
      if (c.presencia === "no_esta") continue;
      const previa = delDia.get(c.id);
      if (previa?.lugar === "obra") continue;
      if (previa?.tareas.some((t) => t.rutina?.rutinaId === r.id)) continue;
      const base: AsignacionDiaria = previa || { id: nuevoId(), company: c.company, fecha, empleadoId: c.id, empleado: c.nombre, lugar: "fabrica", turnos: turnosPorDefecto(fecha), tareas: [] };
      const hueco = [...huecosDelDia(base)].reverse().find(([x, y]) => y - x >= duracion);
      if (!hueco) continue;
      const tarea: TareaDelDia = {
        id: nuevoId(),
        tipoTareaId: r.tareaId ?? null,
        descripcion: `Orden y limpieza · ${r.nombre}`,
        desde: hhmm(hueco[1] - duracion),
        hasta: hhmm(hueco[1]),
        lugar: "fabrica",
        rutina: { rutinaId: r.id },
      };
      const nueva = { ...base, tareas: [...base.tareas, tarea].sort((p, q) => p.desde.localeCompare(q.desde)) };
      delDia.set(c.id, nueva);
      cambiados.add(c.id);
      puestas.push({ rutinaId: r.id, empleado: c.nombre, desde: tarea.desde, hasta: tarea.hasta });
      faltan--;
    }
    if (faltan > 0) sinHueco.push({ rutinaId: r.id, nombre: r.nombre, faltan });
  });

  return { dias: Array.from(cambiados).map((id) => delDia.get(id) as AsignacionDiaria), puestas, sinHueco, yaEstaban };
}
