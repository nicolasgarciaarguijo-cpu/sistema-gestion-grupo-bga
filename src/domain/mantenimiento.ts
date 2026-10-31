// MANTENIMIENTO · MAQUINAS Y HERRAMIENTAS (Nicolas, 2026-10-26). "Cargar un listado de herramientas para
// realizar la tarea, que se sepa con que herramientas contar a la hora de trabajar. Una solapa de
// mantenimiento vinculada con el listado de maquinas que tengamos en stock: cada maquina con su ficha
// (fecha de compra, especificaciones, usos, fecha de mantenimiento preventivo o de reposicion). Las tareas
// de mantenimiento se generan como tareas a las personas idoneas. La idea: saber la disponibilidad de
// herramientas y garantizar que con las existentes se puedan ejecutar todas las tareas, saber el estado de
// las maquinas, hacer los preventivos con control y vincular esas tareas en el cronograma."
//
// Las maquinas y herramientas SON items de Stock (grupos "Maquinas pesadas", "Maquinas manuales" y
// "Herramientas"): el stock es el dueño del item y la cantidad; aca vive su FICHA (estado, compra, planes
// de mantenimiento e historial), por id de stock. Las tareas del catalogo dicen que herramientas
// necesitan; el mantenimiento se programa como una tarea mas del dia (organizacion diaria) de alguien
// idoneo, y al marcarla hecha queda en el historial de la maquina. Funciones puras.

import { puedeHacer, tieneCapacidades, type CategoriaEmpleado } from "./categoriasEmpleado";
import { turnosPorDefecto, type AsignacionDiaria, type TareaDelDia, type TipoTarea } from "./organizacionDiaria";
import { timeToMinutes } from "./attendance";

export const GRUPOS_MAQUINAS = ["Maquinas pesadas", "Maquinas manuales", "Herramientas"];
export const esMaquinaOHerramienta = (item: { group?: string; kind?: string }) =>
  (item.kind || "general") === "general" && GRUPOS_MAQUINAS.includes(String(item.group || ""));

export type EstadoMaquina = "operativa" | "en_mantenimiento" | "fuera_de_servicio" | "a_reponer";
export const ESTADOS_MAQUINA: Array<{ value: EstadoMaquina; label: string; color: string }> = [
  { value: "operativa", label: "Operativa", color: "#16a34a" },
  { value: "en_mantenimiento", label: "En mantenimiento", color: "#d97706" },
  { value: "fuera_de_servicio", label: "Fuera de servicio", color: "#dc2626" },
  { value: "a_reponer", label: "A reponer", color: "#7c3aed" },
];
export const estadoInfo = (e?: EstadoMaquina) => ESTADOS_MAQUINA.find((x) => x.value === (e || "operativa")) || ESTADOS_MAQUINA[0];

// Un preventivo que se repite: cada N dias desde el ultimo hecho (o en una fecha fija si se carga a mano).
export type PlanMantenimiento = {
  id: number;
  descripcion: string;
  cadaDias: number;
  ultimaFecha?: string; // yyyy-mm-dd: el ultimo hecho
  proximaFecha?: string; // si se fija a mano, manda sobre la cuenta
  // Tarea del catalogo con la que se hace: dice quien es idoneo (sus categorias) y cuanto tarda.
  tareaId?: number | null;
  horas?: number;
  activo?: boolean;
};

export type TipoRegistro = "preventivo" | "correctivo" | "reposicion";
export type RegistroMantenimiento = {
  id: number;
  fecha: string;
  tipo: TipoRegistro;
  planId?: number;
  descripcion: string;
  empleadoId?: number;
  empleado?: string;
  costo?: number;
  notas?: string;
  // La tarea del dia de la que salio (cuando se marco hecha en la organizacion diaria).
  tareaDiaId?: number;
};

export type FichaMaquina = {
  stockItemId: number;
  fechaCompra?: string;
  marca?: string;
  modelo?: string;
  nroSerie?: string;
  proveedor?: string;
  especificaciones?: string;
  usos?: string;
  estado?: EstadoMaquina;
  fechaReposicion?: string;
  planes: PlanMantenimiento[];
  historial: RegistroMantenimiento[];
  notas?: string;
};

export type MaquinaStock = { id: number; description: string; group: string; quantity: number; company: string; code?: string; active?: boolean; location?: string };

export const fichaVacia = (stockItemId: number): FichaMaquina => ({ stockItemId, planes: [], historial: [] });
export const fichaDe = (fichas: FichaMaquina[], stockItemId: number) => fichas.find((f) => f.stockItemId === stockItemId) || fichaVacia(stockItemId);

const DIA = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const sumarDias = (fecha: string, dias: number) => iso(new Date(new Date(`${fecha}T12:00:00Z`).getTime() + dias * DIA));
export const diasHasta = (fecha: string, hoy: string) => Math.round((new Date(`${fecha}T12:00:00Z`).getTime() - new Date(`${hoy}T12:00:00Z`).getTime()) / DIA);

// Proxima fecha de un preventivo: la fijada a mano o la ultima + cada N dias. Sin ninguna de las dos, no hay fecha.
export function proximaFecha(plan: PlanMantenimiento): string | null {
  if (plan.proximaFecha) return plan.proximaFecha;
  if (plan.ultimaFecha && plan.cadaDias > 0) return sumarDias(plan.ultimaFecha, plan.cadaDias);
  return null;
}

export type Vencimiento = { stockItemId: number; maquina: string; planId: number; plan: PlanMantenimiento; fecha: string | null; dias: number | null };

// Los preventivos de todas las maquinas, los vencidos y sin fecha primero.
export function vencimientosDeMantenimiento(maquinas: MaquinaStock[], fichas: FichaMaquina[], hoy: string): Vencimiento[] {
  const out: Vencimiento[] = [];
  maquinas.forEach((m) => {
    if (m.active === false) return;
    const f = fichaDe(fichas, m.id);
    if (f.estado === "a_reponer") return;
    f.planes
      .filter((p) => p.activo !== false)
      .forEach((p) => {
        const fecha = proximaFecha(p);
        out.push({ stockItemId: m.id, maquina: m.description, planId: p.id, plan: p, fecha, dias: fecha ? diasHasta(fecha, hoy) : null });
      });
  });
  return out.sort((a, b) => (a.dias ?? -99999) - (b.dias ?? -99999) || a.maquina.localeCompare(b.maquina));
}

export const nivelVencimiento = (dias: number | null): "rojo" | "amarillo" | "verde" | "gris" =>
  dias == null ? "gris" : dias < 0 ? "rojo" : dias <= 7 ? "amarillo" : "verde";

// ---- Disponibilidad: con lo que hay, ¿se pueden hacer todas las tareas? ------------------------------
export type Faltante = { stockItemId: number; nombre: string; motivo: string };

export function motivoNoDisponible(m: MaquinaStock | undefined, ficha: FichaMaquina | undefined): string | null {
  if (!m) return "no está en stock";
  if (m.active === false) return "dada de baja en stock";
  if (!(Number(m.quantity) > 0)) return "sin unidades en stock";
  const e = ficha?.estado || "operativa";
  if (e !== "operativa") return estadoInfo(e).label.toLowerCase();
  return null;
}

export function herramientasFaltantes(herramientaIds: number[] | undefined, maquinas: MaquinaStock[], fichas: FichaMaquina[]): Faltante[] {
  return (herramientaIds || [])
    .map((id) => {
      const m = maquinas.find((x) => x.id === id);
      const motivo = motivoNoDisponible(m, fichas.find((f) => f.stockItemId === id));
      return motivo ? { stockItemId: id, nombre: m?.description || "herramienta borrada", motivo } : null;
    })
    .filter((x): x is Faltante => !!x);
}

export type DisponibilidadTarea = { tareaId: number; nombre: string; faltantes: Faltante[] };
// Las tareas activas que hoy NO se pueden hacer por alguna herramienta que falta o no anda.
export function tareasTrabadasPorHerramientas(tipos: TipoTarea[], maquinas: MaquinaStock[], fichas: FichaMaquina[]): DisponibilidadTarea[] {
  return tipos
    .filter((t) => t.activa !== false)
    .map((t) => ({ tareaId: t.id, nombre: t.nombre, faltantes: herramientasFaltantes(t.herramientas, maquinas, fichas) }))
    .filter((x) => x.faltantes.length > 0);
}

// Que tareas usan cada maquina (para la ficha y para saber que se frena si se rompe).
export const tareasQueUsan = (stockItemId: number, tipos: TipoTarea[]) => tipos.filter((t) => (t.herramientas || []).includes(stockItemId));

// ---- Programar el mantenimiento como tarea del dia de alguien idoneo -----------------------------------
// Idoneos: los que tienen la tarea en sus categorias internas. Si la tarea no esta en ninguna categoria
// todavia, no hay idoneos marcados (se puede elegir igual a cualquiera).
export function idoneosPara<E extends { id: number; categoriasInternas?: number[]; tareasDominadas?: number[] }>(tareaId: number | null | undefined, empleados: E[], categorias: CategoriaEmpleado[]): E[] {
  if (!tareaId) return [];
  return empleados.filter((e) => tieneCapacidades(e.categoriasInternas, e.tareasDominadas) && puedeHacer(e.categoriasInternas, tareaId, categorias, e.tareasDominadas));
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export type ProgramarMantenimiento = {
  fecha: string;
  empleadoId: number;
  empleado: string;
  company: string;
  stockItemId: number;
  maquina: string;
  plan?: PlanMantenimiento; // ausente = correctivo
  descripcion?: string;
  horas: number;
  nuevoId: () => number;
};

// Suma la tarea al dia de esa persona (si no tenia el dia armado, lo arma en fabrica con los turnos de
// siempre), a continuacion de lo que ya tenia. Devuelve la asignacion a guardar.
export function tareaDeMantenimientoEnElDia(asignaciones: AsignacionDiaria[], p: ProgramarMantenimiento): AsignacionDiaria {
  const previa = asignaciones.find((a) => a.empleadoId === p.empleadoId && a.fecha === p.fecha);
  const base: AsignacionDiaria = previa || {
    id: p.nuevoId(),
    company: p.company,
    fecha: p.fecha,
    empleadoId: p.empleadoId,
    empleado: p.empleado,
    lugar: "fabrica",
    turnos: turnosPorDefecto(p.fecha),
    tareas: [],
  };
  const inicioTurno = timeToMinutes(base.turnos[0]?.desde || "07:30") ?? 450;
  const ultimoFin = Math.max(inicioTurno, ...base.tareas.map((t) => timeToMinutes(t.hasta) ?? 0));
  const duracion = Math.max(15, Math.round((p.horas || 1) * 60));
  const tarea: TareaDelDia = {
    id: p.nuevoId(),
    tipoTareaId: p.plan?.tareaId ?? null,
    descripcion: `Mantenimiento · ${p.maquina} · ${p.descripcion || p.plan?.descripcion || "correctivo"}`,
    desde: hhmm(ultimoFin),
    hasta: hhmm(Math.min(ultimoFin + duracion, 23 * 60 + 59)),
    lugar: "fabrica",
    mantenimiento: { stockItemId: p.stockItemId, planId: p.plan?.id },
  };
  return { ...base, tareas: [...base.tareas, tarea] };
}

// Al guardar un dia: las tareas de mantenimiento marcadas hechas que todavia no estan en el historial de su
// maquina se registran (y el preventivo corre su ultima fecha; si estaba "en mantenimiento", vuelve a operativa).
export function registrarTareasHechas(fichas: FichaMaquina[], a: AsignacionDiaria, nuevoId: () => number): FichaMaquina[] {
  let out = fichas;
  a.tareas.forEach((t) => {
    if (!t.hecha || !t.mantenimiento) return;
    const { stockItemId, planId } = t.mantenimiento;
    const ficha = fichaDe(out, stockItemId);
    if (ficha.historial.some((r) => r.tareaDiaId === t.id)) return;
    const fecha = (t.hechaEn || "").slice(0, 10) || a.fecha;
    const registro: RegistroMantenimiento = {
      id: nuevoId(),
      fecha,
      tipo: planId ? "preventivo" : "correctivo",
      planId,
      descripcion: t.descripcion,
      empleadoId: a.empleadoId,
      empleado: a.empleado,
      tareaDiaId: t.id,
    };
    const nueva = registrarMantenimiento(ficha, registro);
    out = out.some((f) => f.stockItemId === stockItemId) ? out.map((f) => (f.stockItemId === stockItemId ? nueva : f)) : [...out, nueva];
  });
  return out;
}

// Asentar un mantenimiento en la ficha (a mano o desde la tarea del dia).
export function registrarMantenimiento(ficha: FichaMaquina, r: RegistroMantenimiento): FichaMaquina {
  const planes = ficha.planes.map((p) =>
    p.id === r.planId && (!p.ultimaFecha || r.fecha >= p.ultimaFecha) ? { ...p, ultimaFecha: r.fecha, proximaFecha: undefined } : p
  );
  const estado = r.tipo === "reposicion" || ficha.estado === "en_mantenimiento" ? "operativa" : ficha.estado;
  return { ...ficha, planes, estado, historial: [...ficha.historial, r].sort((x, y) => y.fecha.localeCompare(x.fecha)) };
}

// Catalogo de arranque para mantenimiento (grupo de trabajo + tareas), si todavia no existe.
export const TAREAS_MANTENIMIENTO_BASE = ["Mantenimiento preventivo", "Mantenimiento correctivo", "Limpieza y lubricación", "Cambio de cuchillas / afilado"];
