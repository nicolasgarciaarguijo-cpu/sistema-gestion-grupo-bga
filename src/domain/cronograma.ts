// CRONOGRAMA AUTOMATICO DE FABRICACION (fases 4 y 5, Nicolas 2026-10-26). Junta los trabajos aprobados que tienen sus
// muebles cargados, calcula quien hace cada tarea (domain/presupuestoMuebles: los mejores, lo mas rapido, con la gente
// de De Raiz) y lo pasa al calendario del taller: lunes a viernes de 07:30 a 17:00, con el almuerzo de 13:30 a 14:00
// (9 hs por dia, sin sabados). Cada trabajo arranca en su fecha de inicio; despues dice si llega a la entrega con la
// holgura (10 dias habiles por defecto, editable por trabajo).
import { calcularMueblesDelPresupuesto, planificarMuebles, type AsignacionTarea, type MuebleDelPresupuesto, type PersonaParaCotizar } from "./presupuestoMuebles";
import type { TipoMueble } from "./tiposMueble";
import { turnosPorDefecto, type AsignacionDiaria, type TipoTarea } from "./organizacionDiaria";
import type { RubroFabricacion } from "./ganttFabricacion";

export const HORAS_POR_DIA = 9;
const INICIO_MIN = 7 * 60 + 30;
const ALMUERZO_DESDE = 13 * 60 + 30;
const ALMUERZO_MIN = 30;
export const HOLGURA_POR_DEFECTO = 10;

const fechaDe = (iso: string) => new Date(`${iso}T12:00:00`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const esHabil = (fecha: string) => {
  const dow = fechaDe(fecha).getDay();
  return dow !== 0 && dow !== 6;
};
export function sumarDias(fecha: string, n: number): string {
  const d = fechaDe(fecha);
  d.setDate(d.getDate() + n);
  return iso(d);
}
// El primer dia habil desde `fecha` (inclusive).
export function primerHabil(fecha: string): string {
  let f = fecha;
  while (!esHabil(f)) f = sumarDias(f, 1);
  return f;
}
// El dia habil numero `n` (0 = el primer habil desde `base`).
export function diaHabil(base: string, n: number): string {
  let f = primerHabil(base);
  for (let i = 0; i < n; i++) f = primerHabil(sumarDias(f, 1));
  return f;
}
// Dias habiles de `desde` a `hasta` (negativo si hasta es antes). Ej.: de lunes a miercoles = 2.
export function diasHabilesEntre(desde: string, hasta: string): number {
  if (desde === hasta) return 0;
  const signo = hasta > desde ? 1 : -1;
  let n = 0;
  let f = desde;
  while (f !== hasta) {
    f = sumarDias(f, signo);
    if (esHabil(f)) n += signo;
  }
  return n;
}
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.round(min % 60)).padStart(2, "0")}`;

// Hora de trabajo (desde el arranque del primer dia habil de `base`) -> dia y hora del reloj.
export function relojDe(base: string, horas: number): { fecha: string; hora: string } {
  const dia = Math.floor(horas / HORAS_POR_DIA + 1e-9);
  const dentro = (horas - dia * HORAS_POR_DIA) * 60;
  let min = INICIO_MIN + dentro;
  if (min >= ALMUERZO_DESDE - 1e-9) min += ALMUERZO_MIN; // desde las 6 hs de trabajo, despues del almuerzo
  return { fecha: diaHabil(base, dia), hora: hhmm(min) };
}
// Un tramo [inicio, fin) de horas de trabajo partido por dia y por el almuerzo.
export function tramosDe(base: string, inicio: number, fin: number): Array<{ fecha: string; desde: string; hasta: string }> {
  const out: Array<{ fecha: string; desde: string; hasta: string }> = [];
  const corteAlmuerzo = (ALMUERZO_DESDE - INICIO_MIN) / 60; // 6 hs de trabajo antes del almuerzo
  let t = inicio;
  while (t < fin - 1e-9) {
    const dia = Math.floor(t / HORAS_POR_DIA + 1e-9);
    const enDia = t - dia * HORAS_POR_DIA;
    const limite = dia * HORAS_POR_DIA + (enDia < corteAlmuerzo - 1e-9 ? corteAlmuerzo : HORAS_POR_DIA);
    const hasta = Math.min(fin, limite);
    const a = relojDe(base, t);
    // el final de un tramo que termina justo en el almuerzo o al cierre se muestra como 13:30 / 17:00
    const finMin = INICIO_MIN + (hasta - dia * HORAS_POR_DIA) * 60 + (hasta - dia * HORAS_POR_DIA > corteAlmuerzo + 1e-9 ? ALMUERZO_MIN : 0);
    out.push({ fecha: a.fecha, desde: a.hora, hasta: hhmm(finMin) });
    t = hasta;
  }
  return out;
}

// La fabricacion de un trabajo: sus muebles (del presupuesto, o cargados en Fabricacion para los presupuestos viejos),
// desde cuando arranca y la holgura que se le pide.
export type FabricacionDelTrabajo = { muebles?: MuebleDelPresupuesto[]; inicio?: string; holguraDias?: number };

export type TrabajoParaCronograma = {
  jobId: number;
  nombre: string;
  inicio: string; // fecha de inicio en fabrica
  entrega?: string;
  holguraDias?: number;
  muebles: MuebleDelPresupuesto[];
  // materiales cotizados (para las tareas que salen de materiales)
  materiales: Array<{ description: string; qty: number }>;
};

export type EstadoEntrega = "llega" | "justo" | "no_llega" | "sin_entrega" | "sin_datos";

export type ResultadoTrabajo = {
  jobId: number;
  nombre: string;
  horasHombre: number;
  incompleto: boolean;
  inicio: string;
  fin?: string; // ultimo dia de trabajo
  entrega?: string;
  holguraDias: number;
  margenDias?: number; // dias habiles entre el fin y la entrega
  estado: EstadoEntrega;
  asignaciones: AsignacionTarea[];
};

export function cronogramaDeTrabajos(
  trabajos: TrabajoParaCronograma[],
  tipos: TipoMueble[],
  tareas: TipoTarea[],
  rubros: RubroFabricacion[],
  personas: PersonaParaCotizar[],
  hoy: string
): { base: string; trabajos: ResultadoTrabajo[]; asignaciones: AsignacionTarea[]; muebleDeTrabajo: Record<number, number> } {
  const base = primerHabil(hoy);
  // Todos los muebles de todos los trabajos, cada uno liberado en el inicio de su trabajo.
  const calculados = trabajos.flatMap((t) => calcularMueblesDelPresupuesto(t.muebles, tipos, tareas, t.materiales, rubros).muebles);
  const muebleDeTrabajo: Record<number, number> = {};
  const liberacion: Record<number, number> = {};
  trabajos.forEach((t) => {
    const desde = t.inicio > base ? Math.max(0, diasHabilesEntre(base, primerHabil(t.inicio))) * HORAS_POR_DIA : 0;
    t.muebles.forEach((m) => {
      muebleDeTrabajo[m.id] = t.jobId;
      liberacion[m.id] = desde;
    });
  });
  const plan = planificarMuebles(calculados, personas, liberacion);
  const resultados: ResultadoTrabajo[] = trabajos.map((t) => {
    const ids = new Set(t.muebles.map((m) => m.id));
    const asign = plan.asignaciones.filter((a) => ids.has(a.muebleId));
    const calc = calculados.filter((c) => ids.has(c.mueble.id));
    const horasHombre = Math.round(calc.reduce((s, c) => s + c.horasHombre, 0) * 100) / 100;
    const holguraDias = t.holguraDias ?? HOLGURA_POR_DEFECTO;
    if (!asign.length) {
      return { jobId: t.jobId, nombre: t.nombre, horasHombre, incompleto: true, inicio: t.inicio, entrega: t.entrega, holguraDias, estado: "sin_datos", asignaciones: [] };
    }
    const finHoras = Math.max(...asign.map((a) => a.fin));
    // el ultimo dia en que se trabaja (si termina justo al cierre, es ese dia)
    const fin = relojDe(base, Math.max(0, finHoras - 1e-6)).fecha;
    let estado: EstadoEntrega = "sin_entrega";
    let margenDias: number | undefined;
    if (t.entrega) {
      margenDias = diasHabilesEntre(fin, t.entrega);
      estado = margenDias < 0 ? "no_llega" : margenDias < holguraDias ? "justo" : "llega";
    }
    return {
      jobId: t.jobId,
      nombre: t.nombre,
      horasHombre,
      incompleto: calc.some((c) => c.incompleto),
      inicio: t.inicio,
      fin,
      entrega: t.entrega,
      holguraDias,
      margenDias,
      estado,
      asignaciones: asign,
    };
  });
  return { base, trabajos: resultados, asignaciones: plan.asignaciones, muebleDeTrabajo };
}

// Las tareas de un trabajo por persona y por dia, listas para la organizacion diaria.
export function tareasPorPersonaYDia(
  base: string,
  asignaciones: AsignacionTarea[],
  nombreMueble: (muebleId: number) => string
): Array<{ personaId: number; fecha: string; desde: string; hasta: string; descripcion: string; tareaId: number }> {
  const out: Array<{ personaId: number; fecha: string; desde: string; hasta: string; descripcion: string; tareaId: number }> = [];
  asignaciones.forEach((a) => {
    const gente = [a.personaId, ...a.ayudantes.map((y) => y.personaId)].filter((x): x is number => x != null);
    tramosDe(base, a.inicio, a.fin).forEach((tr) =>
      gente.forEach((personaId) => out.push({ personaId, ...tr, descripcion: `${a.nombre} · ${nombreMueble(a.muebleId)}`, tareaId: a.tareaId }))
    );
  });
  return out.sort((x, y) => x.fecha.localeCompare(y.fecha) || x.desde.localeCompare(y.desde));
}

// Vuelca las tareas del cronograma de un trabajo en la organizacion diaria (el dia de cada persona). Si el dia no estaba
// armado, se arma en fabrica con los turnos de siempre. Apretarlo dos veces no duplica (misma tarea, mismo horario).
export function volcarEnOrganizacion(
  asignaciones: AsignacionDiaria[],
  filas: Array<{ personaId: number; fecha: string; desde: string; hasta: string; descripcion: string; tareaId: number }>,
  empleados: Array<{ id: number; name: string; company: string }>,
  jobId: number,
  nuevoId: () => number
): AsignacionDiaria[] {
  const cambiadas = new Map<number, AsignacionDiaria>();
  const buscar = (personaId: number, fecha: string) =>
    Array.from(cambiadas.values()).find((a) => a.empleadoId === personaId && a.fecha === fecha) ||
    asignaciones.find((a) => a.empleadoId === personaId && a.fecha === fecha);
  filas.forEach((f) => {
    const emp = empleados.find((e) => e.id === f.personaId);
    if (!emp) return;
    const previa = buscar(f.personaId, f.fecha);
    const dia: AsignacionDiaria = previa || {
      id: nuevoId(),
      company: emp.company,
      fecha: f.fecha,
      empleadoId: emp.id,
      empleado: emp.name,
      lugar: "fabrica",
      turnos: turnosPorDefecto(f.fecha),
      tareas: [],
    };
    if (dia.tareas.some((t) => t.jobId === jobId && t.desde === f.desde && t.hasta === f.hasta && t.descripcion === f.descripcion)) return;
    cambiadas.set(dia.id, {
      ...dia,
      tareas: [...dia.tareas, { id: nuevoId(), tipoTareaId: f.tareaId, descripcion: f.descripcion, desde: f.desde, hasta: f.hasta, lugar: "fabrica", jobId }],
    });
  });
  return Array.from(cambiadas.values());
}
