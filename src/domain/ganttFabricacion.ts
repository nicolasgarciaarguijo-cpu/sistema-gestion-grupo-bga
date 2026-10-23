// FABRICACION · GANTT (Nicolas, 2026-10-22). "Ver los trabajos aprobados que esperan asignacion de tareas,
// agrupados por cantidades: placas de melamina, enchapadas, MDF, modulos, cajones, puertas, metros de
// iluminacion, m2 laqueados, modulos de instalacion (lista editable). La informacion sale de la
// presupuestacion y queda vinculada. Por cada grupo se carga tarea, personas y horas, para presupuestar y
// coordinar."
//
// Las cantidades salen SOLAS de lo cotizado (domain/jobMaterials: los materiales del snapshot del
// presupuesto, bloque x unidades): cada rubro tiene palabras clave que se buscan en la descripcion del
// material. Si el numero no es el real se pisa a mano en el plan (la cantidad cotizada sigue a la vista).
// "Modulos" cuenta las unidades de los subpresupuestos. Funciones puras.

import { resumirMaterialesDelTrabajo } from "./jobMaterials";

export type OrigenRubro = "materiales" | "bloques" | "manual";
export type RubroFabricacion = {
  id: number;
  nombre: string;
  unidad: string;
  origen: OrigenRubro;
  // Palabras que se buscan en la descripcion del material (sin acentos ni mayusculas). Alcanza con una.
  palabras: string[];
  // Palabras que excluyen (ej. "canto" para que "canto melamina" no cuente como placa).
  excluir?: string[];
  // Tipo de tarea del catalogo que suele hacer este rubro (sus horas estandar sugieren las horas).
  tipoTareaId?: number | null;
  orden?: number;
  activo?: boolean;
};

export const RUBROS_POR_DEFECTO: RubroFabricacion[] = [
  { id: 1, nombre: "Placas de melamina", unidad: "placas", origen: "materiales", palabras: ["melamina"], excluir: ["canto", "tapacanto"], orden: 1 },
  { id: 2, nombre: "Placas enchapadas", unidad: "placas", origen: "materiales", palabras: ["enchapad", "enchape"], excluir: ["canto", "tapacanto"], orden: 2 },
  { id: 3, nombre: "Placas de MDF", unidad: "placas", origen: "materiales", palabras: ["mdf"], excluir: ["canto", "tapacanto", "melamina", "enchap"], orden: 3 },
  { id: 4, nombre: "Módulos", unidad: "u", origen: "bloques", palabras: [], orden: 4 },
  { id: 5, nombre: "Cajones", unidad: "u", origen: "materiales", palabras: ["corredera", "cajon"], orden: 5 },
  { id: 6, nombre: "Puertas", unidad: "u", origen: "materiales", palabras: ["puerta"], orden: 6 },
  { id: 7, nombre: "Iluminación", unidad: "m", origen: "materiales", palabras: ["led", "iluminacion"], orden: 7 },
  { id: 8, nombre: "Laqueado", unidad: "m²", origen: "materiales", palabras: ["laca", "laqueado", "laquead"], orden: 8 },
  { id: 9, nombre: "Módulos de instalación", unidad: "u", origen: "manual", palabras: [], orden: 9 },
];

// El plan de un trabajo: por rubro, cuanto hay que hacer, quien y cuando.
export type PlanRubro = {
  rubroId: number;
  cantidad?: number; // pisa lo cotizado
  tipoTareaId?: number | null;
  tarea?: string;
  personas?: number;
  horas?: number; // horas-hombre totales del rubro
  desde?: string; // yyyy-mm-dd
  hasta?: string;
  hecho?: boolean;
};
export type PlanFabricacion = {
  id: number;
  company: string;
  jobId: number;
  rubros: PlanRubro[];
  notas?: string;
  firmante?: string;
  firmadoEn?: string;
};

export const sinAcentos = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export type CantidadCotizada = { cantidad: number; detalle: Array<{ descripcion: string; cantidad: number; unidad: string }> };

// Lo cotizado de cada rubro en un trabajo (o presupuesto: cualquier cosa con snapshot).
export function cantidadesCotizadas(job: any, rubros: RubroFabricacion[]): Record<number, CantidadCotizada> {
  const resumen = resumirMaterialesDelTrabajo(job);
  const out: Record<number, CantidadCotizada> = {};
  rubros.forEach((r) => {
    if (r.origen === "bloques") {
      const detalle = resumen.bloques.map((b) => ({ descripcion: b.titulo, cantidad: b.unidades, unidad: "u" }));
      out[r.id] = { cantidad: detalle.reduce((a, d) => a + d.cantidad, 0), detalle };
      return;
    }
    if (r.origen === "manual" || !r.palabras.some((p) => p.trim())) {
      out[r.id] = { cantidad: 0, detalle: [] };
      return;
    }
    const si = r.palabras.map(sinAcentos).filter(Boolean);
    const no = (r.excluir || []).map(sinAcentos).filter(Boolean);
    const detalle = resumen.consolidado
      .filter((f) => {
        // Por comienzo de palabra: "laca" no tiene que agarrar "placa".
        const palabras = sinAcentos(f.descripcion).split(/[^a-z0-9]+/).filter(Boolean);
        const tiene = (p: string) => palabras.some((w) => w.startsWith(p));
        return si.some(tiene) && !no.some(tiene);
      })
      .map((f) => ({ descripcion: f.descripcion, cantidad: f.cantidad, unidad: f.unidad }));
    out[r.id] = { cantidad: Math.round(detalle.reduce((a, d) => a + d.cantidad, 0) * 100) / 100, detalle };
  });
  return out;
}

// Cantidad que vale para el plan: la cargada a mano o, si no hay, la cotizada.
export const cantidadDelRubro = (plan: PlanRubro | undefined, cotizada: CantidadCotizada | undefined): number =>
  plan?.cantidad != null && Number.isFinite(plan.cantidad) ? plan.cantidad : cotizada?.cantidad || 0;

// Horas sugeridas: cantidad x horas estandar por unidad del tipo de tarea.
export const horasSugeridas = (cantidad: number, horasEstandarPorUnidad?: number): number =>
  horasEstandarPorUnidad && cantidad ? Math.round(cantidad * horasEstandarPorUnidad * 100) / 100 : 0;

// Jornada de fabrica para pasar horas-hombre a dias: 9 h de L a V (07:30-17:00 menos almuerzo).
export const HORAS_JORNADA = 9;

const aIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const esHabil = (iso: string, feriados?: Set<string>) => {
  const dow = new Date(`${iso}T12:00:00`).getDay();
  return dow !== 0 && dow !== 6 && !(feriados && feriados.has(iso));
};
export function sumarHabiles(desde: string, dias: number, feriados?: Set<string>): string {
  const d = new Date(`${desde}T12:00:00`);
  while (!esHabil(aIso(d), feriados)) d.setDate(d.getDate() + 1);
  let quedan = Math.max(1, Math.ceil(dias)) - 1;
  while (quedan > 0) {
    d.setDate(d.getDate() + 1);
    if (esHabil(aIso(d), feriados)) quedan--;
  }
  return aIso(d);
}

// Dias habiles que lleva un rubro con N personas, y la fecha de fin si se sabe el inicio.
export function duracionDelRubro(horas: number, personas: number): number {
  if (!horas || horas <= 0) return 0;
  return Math.ceil(horas / (Math.max(1, personas || 1) * HORAS_JORNADA));
}
export const finSugerido = (r: PlanRubro, feriados?: Set<string>): string | undefined =>
  r.desde && r.horas ? sumarHabiles(r.desde, duracionDelRubro(r.horas, r.personas || 1), feriados) : undefined;

// Un trabajo espera asignacion si no esta finalizado y le falta plan con fechas en algun rubro con cantidad.
export function estadoDelPlan(
  cotizadas: Record<number, CantidadCotizada>,
  plan: PlanFabricacion | undefined,
  rubros: RubroFabricacion[]
): { conCantidad: number; asignados: number; espera: boolean; horas: number } {
  let conCantidad = 0;
  let asignados = 0;
  let horas = 0;
  rubros.forEach((r) => {
    const p = plan?.rubros.find((x) => x.rubroId === r.id);
    if (cantidadDelRubro(p, cotizadas[r.id]) > 0 || p?.horas) {
      conCantidad++;
      if (p?.desde && (p.personas || 0) > 0 && (p.horas || 0) > 0) asignados++;
    }
    horas += p?.horas || 0;
  });
  return { conCantidad, asignados, espera: conCantidad === 0 || asignados < conCantidad, horas: Math.round(horas * 100) / 100 };
}

// Carga del taller por dia: personas asignadas en todos los planes ese dia (para no pasarse de la gente).
export function cargaPorDia(planes: PlanFabricacion[], feriados?: Set<string>): Map<string, number> {
  const carga = new Map<string, number>();
  planes.forEach((pl) =>
    pl.rubros.forEach((r) => {
      if (r.hecho || !r.desde) return;
      const hasta = r.hasta || finSugerido(r, feriados) || r.desde;
      const d = new Date(`${r.desde}T12:00:00`);
      for (let i = 0; i < 400 && aIso(d) <= hasta; i++, d.setDate(d.getDate() + 1)) {
        const iso = aIso(d);
        if (esHabil(iso, feriados)) carga.set(iso, (carga.get(iso) || 0) + (r.personas || 0));
      }
    })
  );
  return carga;
}

// ---- Compras pendientes por trabajo (Nicolas, 2026-10-23) ------------------------------------------
// "Las compras pendientes para fabricacion en la ficha de cada trabajo y el reporte en Compras, separado
// por trabajo, vinculado con los bloques de fabricacion para tener el contador de dias restantes."
// La fecha limite para tener el material es el PRIMER rubro del Gantt que arranca (sin hacer); si el
// trabajo todavia no esta planificado, la fecha de inicio del trabajo; si tampoco, la fecha maxima de
// requerimiento del presupuesto.
export type FechaLimiteCompra = { fecha: string; origen: string } | null;
export function fechaLimiteCompra(
  job: { startDate?: string; maxRequirementDate?: string },
  plan: PlanFabricacion | undefined,
  rubros: RubroFabricacion[]
): FechaLimiteCompra {
  const primero = (plan?.rubros || [])
    .filter((r) => r.desde && !r.hecho)
    .sort((a, b) => String(a.desde).localeCompare(String(b.desde)))[0];
  if (primero?.desde) {
    const nombre = rubros.find((r) => r.id === primero.rubroId)?.nombre || "rubro";
    return { fecha: primero.desde, origen: `arranca ${nombre} (Gantt)` };
  }
  if (job.startDate) return { fecha: job.startDate, origen: "inicio del trabajo" };
  if (job.maxRequirementDate) return { fecha: job.maxRequirementDate, origen: "fecha máxima del presupuesto" };
  return null;
}

// Dias corridos de hoy a la fecha (negativo = vencida).
export function diasRestantes(fecha: string, hoyIso: string): number {
  const a = new Date(`${hoyIso}T12:00:00`).getTime();
  const b = new Date(`${fecha}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export const nivelDias = (dias: number | null): "rojo" | "amarillo" | "verde" | "gris" =>
  dias == null ? "gris" : dias <= 3 ? "rojo" : dias <= 7 ? "amarillo" : "verde";
