// FABRICACION · ORGANIZACION DIARIA (Nicolas, 2026-10-22). "Cargar las tareas que va a realizar cada empleado
// durante el dia, empezando por si va a estar en obra o en fabrica (la obra sale de los trabajos aprobados),
// con las horas del dia en turno manana 07:30-13:30 y turno tarde 13:30-17:00, pudiendo cambiarlos si se
// sabe de antemano que habra horas extras, alineado con el modo de horas extras (hasta las 21 al 50%,
// despues nocturna). Dar tareas por hora, marcar tarea realizada con el horario en que se termino, exportar
// un PDF por empleado y ver en una linea temporal donde esta cada uno y cuantos hay juntos en cada lugar."
//
// Las horas de cada turno se clasifican con la MISMA regla que la liquidacion (domain/attendance.ts
// `deriveConvenioHours`): normal, extra 50 / 100, nocturna y feriado. Asi lo planificado y lo que despues
// liquida la fichada hablan el mismo idioma. Funciones puras.

import { deriveConvenioHours, timeToMinutes, type ConvenioHours } from "./attendance";

// ---- Catalogo: grupos de trabajo y tipos de tarea (se arman una vez y se editan) ----------------
export type UnidadTarea = "u" | "ml" | "m2" | "m3";
export const UNIDADES_TAREA: Array<{ value: UnidadTarea; label: string }> = [
  { value: "u", label: "unidades" },
  { value: "ml", label: "metros lineales" },
  { value: "m2", label: "m²" },
  { value: "m3", label: "m³" },
];
export type GrupoTrabajo = { id: number; nombre: string; descripcion?: string; orden?: number };
export type TipoTarea = {
  id: number;
  grupoId?: number | null;
  nombre: string;
  // Desglose: los pasos de la tarea, para no tipear todo cada vez.
  pasos?: string[];
  // Unidad en que se mide la tarea (Nicolas, 2026-10-25: siempre unidades, metros lineales, m2 o m3).
  unidad?: UnidadTarea;
  // Tiempo estandar en horas POR UNIDAD (el Gantt lo multiplica por la cantidad) para planificar y
  // presupuestar.
  horasEstimadas?: number;
  // Cuantas personas hacen falta a la vez (Nicolas, 2026-10-26: "comunmente por dimensiones, no porque se
  // necesiten 2 cabezas"). Ausente = 1. Con 2 o mas: un especialista (idoneo) + ayudantes. El tiempo no cambia;
  // las horas-hombre y el costo se multiplican.
  personas?: number;
  // Maquinas y herramientas que hacen falta (ids de items de Stock). Ver domain/mantenimiento.ts.
  herramientas?: number[];
  activa?: boolean;
};

// ---- El dia de cada empleado ---------------------------------------------------------------------
export type LugarDelDia = "fabrica" | "obra";
export type TurnoDia = { id: string; nombre: string; desde: string; hasta: string };
export type TareaDelDia = {
  id: number;
  tipoTareaId?: number | null;
  descripcion: string;
  desde: string; // "08:00"
  hasta: string; // "10:30"
  // Donde se hace (si el empleado va a mas de un lugar en el dia). Ausente = el lugar del dia.
  lugar?: LugarDelDia;
  jobId?: number | null;
  hecha?: boolean;
  hechaEn?: string; // ISO: cuando se marco hecha (para tomar tiempos)
  notas?: string;
  // Tarea de mantenimiento de una maquina (al marcarla hecha queda en su historial).
  mantenimiento?: { stockItemId: number; planId?: number };
};
export type AsignacionDiaria = {
  id: number;
  company: string;
  fecha: string; // yyyy-mm-dd
  empleadoId: number;
  empleado: string;
  lugar: LugarDelDia;
  jobId?: number | null; // la obra (trabajo aprobado), si esta en obra
  turnos: TurnoDia[];
  tareas: TareaDelDia[];
  notas?: string;
  firmante?: string;
  firmadoEn?: string;
};

// Turnos de siempre: manana 07:30-13:30 y tarde 13:30-17:00. El sabado se trabaja a la manana (al 50%).
export function turnosPorDefecto(fecha: string): TurnoDia[] {
  const dow = new Date(`${fecha}T12:00:00`).getDay();
  if (dow === 0) return [];
  if (dow === 6) return [{ id: "manana", nombre: "Mañana", desde: "07:00", hasta: "13:00" }];
  return [
    { id: "manana", nombre: "Mañana", desde: "07:30", hasta: "13:30" },
    { id: "tarde", nombre: "Tarde", desde: "13:30", hasta: "17:00" },
  ];
}

// Sugerencia para un turno EXTRA despues del ultimo: hasta las 21 (al 50%) o, si ya paso, nocturno.
export function turnoExtraSiguiente(turnos: TurnoDia[]): TurnoDia {
  const ultimo = [...turnos].sort((a, b) => a.hasta.localeCompare(b.hasta)).pop();
  const desde = ultimo?.hasta || "17:00";
  const desdeMin = timeToMinutes(desde) ?? 17 * 60;
  const hasta = desdeMin < 21 * 60 ? "21:00" : "23:00";
  return { id: `extra-${desde}`, nombre: desdeMin < 21 * 60 ? "Extra" : "Noche", desde, hasta };
}

// Horas de un tramo clasificadas como las liquida el sistema.
export function horasDelTramo(fecha: string, desde: string, hasta: string): ConvenioHours {
  return deriveConvenioHours(fecha, desde, hasta);
}

// Etiqueta corta de como se paga un tramo: "normal", "extra 50%", "extra 100%", "nocturna", "feriado"
// o la combinacion si cruza franjas.
export function comoSePaga(fecha: string, desde: string, hasta: string): string {
  const h = horasDelTramo(fecha, desde, hasta);
  const partes: string[] = [];
  if (h.normalHours) partes.push(`${h.normalHours} h normal`);
  if (h.extra50Hours) partes.push(`${h.extra50Hours} h extra 50%`);
  if (h.extra100Hours) partes.push(`${h.extra100Hours} h extra 100%`);
  if (h.night50Hours) partes.push(`${h.night50Hours} h nocturna 50%`);
  if (h.night100Hours) partes.push(`${h.night100Hours} h nocturna 100%`);
  if (h.holidayHours) partes.push(`${h.holidayHours} h feriado`);
  return partes.join(" · ") || "sin horas";
}

// Total de horas planificadas del dia (todos los turnos), por categoria.
export function horasDelDia(a: Pick<AsignacionDiaria, "fecha" | "turnos">): ConvenioHours & { total: number } {
  const acc = { normalHours: 0, extra50Hours: 0, extra100Hours: 0, night50Hours: 0, holidayHours: 0, night100Hours: 0 };
  a.turnos.forEach((t) => {
    const h = horasDelTramo(a.fecha, t.desde, t.hasta);
    (Object.keys(acc) as Array<keyof typeof acc>).forEach((k) => (acc[k] += h[k]));
  });
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const out = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, r2(v)])) as ConvenioHours;
  return { ...out, total: r2(Object.values(out).reduce((x, y) => x + y, 0)) };
}

const min = (hhmm: string) => timeToMinutes(hhmm) ?? 0;

// Tareas del dia que se pisan entre si (mismo empleado, horarios superpuestos) o que caen fuera de sus turnos.
export function avisosDelDia(a: Pick<AsignacionDiaria, "turnos" | "tareas">): string[] {
  const avisos: string[] = [];
  const tareas = [...a.tareas].sort((x, y) => x.desde.localeCompare(y.desde));
  for (let i = 1; i < tareas.length; i++) {
    if (min(tareas[i].desde) < min(tareas[i - 1].hasta)) avisos.push(`"${tareas[i - 1].descripcion || "tarea"}" y "${tareas[i].descripcion || "tarea"}" se pisan`);
  }
  tareas.forEach((t) => {
    const dentro = a.turnos.some((tu) => min(t.desde) >= min(tu.desde) && min(t.hasta) <= min(tu.hasta));
    if (!dentro && t.desde && t.hasta) avisos.push(`"${t.descripcion || "tarea"}" (${t.desde}-${t.hasta}) cae fuera de los turnos`);
  });
  return avisos;
}

// Tiempo real de una tarea marcada hecha: desde su inicio planificado hasta cuando se marco (minutos), para
// comparar contra lo planificado y contra el estandar del tipo de tarea.
export function minutosReales(t: Pick<TareaDelDia, "desde" | "hechaEn">, fecha: string): number | null {
  if (!t.hechaEn || !t.desde) return null;
  const fin = new Date(t.hechaEn);
  if (Number.isNaN(fin.getTime()) || t.hechaEn.slice(0, 10) !== fecha) return null;
  const finMin = fin.getHours() * 60 + fin.getMinutes();
  const r = finMin - min(t.desde);
  return r >= 0 ? r : null;
}

// ---- Linea temporal: quien esta en cada lugar ---------------------------------------------------
export type FranjaLugar = { lugarKey: string; lugarLabel: string; empleado: string; desde: string; hasta: string };

// Cada empleado en su lugar, por turno (y por tarea si la tarea es en otro lugar). lugarKey: "fabrica" o "obra:<jobId>".
export function franjasPorLugar(
  asignaciones: AsignacionDiaria[],
  nombreObra: (jobId: number) => string
): FranjaLugar[] {
  const out: FranjaLugar[] = [];
  asignaciones.forEach((a) => {
    const key = a.lugar === "obra" && a.jobId != null ? `obra:${a.jobId}` : "fabrica";
    const label = key === "fabrica" ? "Fábrica" : nombreObra(Number(a.jobId));
    a.turnos.forEach((t) => out.push({ lugarKey: key, lugarLabel: label, empleado: a.empleado, desde: t.desde, hasta: t.hasta }));
  });
  return out;
}

// Cuantas personas hay en cada lugar a la vez (el maximo en el dia) y quienes.
export function genteJuntaPorLugar(franjas: FranjaLugar[]): Array<{ lugarKey: string; lugarLabel: string; personas: string[]; maximoJuntos: number }> {
  const porLugar = new Map<string, FranjaLugar[]>();
  franjas.forEach((f) => porLugar.set(f.lugarKey, [...(porLugar.get(f.lugarKey) || []), f]));
  return Array.from(porLugar.entries())
    .map(([lugarKey, fs]) => {
      // Barrido por minutos de inicio/fin.
      const eventos = fs.flatMap((f) => [
        { t: min(f.desde), d: 1 },
        { t: min(f.hasta), d: -1 },
      ]).sort((a, b) => a.t - b.t || a.d - b.d);
      let actual = 0;
      let maximo = 0;
      eventos.forEach((e) => {
        actual += e.d;
        maximo = Math.max(maximo, actual);
      });
      return { lugarKey, lugarLabel: fs[0].lugarLabel, personas: Array.from(new Set(fs.map((f) => f.empleado))).sort(), maximoJuntos: maximo };
    })
    .sort((a, b) => (a.lugarKey === "fabrica" ? -1 : b.lugarKey === "fabrica" ? 1 : a.lugarLabel.localeCompare(b.lugarLabel)));
}

// Link a Google Maps de una obra (con la direccion de entrega del trabajo). Sin direccion, sin link.
export function linkMapa(direccion?: string): string | null {
  const d = String(direccion || "").trim();
  return d ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}` : null;
}
