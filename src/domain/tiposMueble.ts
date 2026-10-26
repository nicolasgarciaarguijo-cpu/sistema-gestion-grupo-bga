// FABRICACION · TIPOS DE MUEBLE (Nicolas, 2026-10-25/26). "Los tipos de mueble deben estar desglosados en
// tareas con un orden. Distintos muebles pueden intercalarse; la idea es que cada persona haga solo lo que
// domina." El catalogo de tareas es UNO solo (TipoTarea) y cada tipo de mueble es una RECETA ordenada que
// lo usa, asi la categoria "Armador" sirve para todos los muebles.
//
// El orden va por PASOS: "3.1, 3.2, 3.3 son tareas del paso 3 que pueden hacer distintas personas a la vez;
// la siguiente es su consecuente 4.1, 4.2... si solo hay un 5, deben terminarse las 4 para pasar al 5". Se
// carga el numero entero del paso; el .1/.2 sale solo por el orden de la lista.
//
// "El tipo de mueble garantiza ciertas tareas, el tamano asegura los tiempos y la cantidad de materiales,
// herrajes, ml o m2 van afinando el cronograma": cada renglon dice de que MEDIDA del mueble sale su
// cantidad (por mueble, ml, m2 o m3) y cuanto lleva por cada una. La cantidad sale sola de las medidas y
// se puede corregir a mano ("las 2 cosas hasta ver cual es la mas util"). Funciones puras.

import type { TipoTarea, UnidadTarea } from "./organizacionDiaria";
import { coincideConRubro, type RubroFabricacion } from "./ganttFabricacion";

// De que medida del mueble sale la cantidad de la tarea. "u" = por cada mueble. "rubro:<id>" = por cada
// unidad de un rubro de materiales del presupuesto (placas, cajones, puertas, herrajes...: los rubros del
// Gantt, con sus palabras clave), asi la cantidad de herrajes o de placas afina el tiempo.
export type BaseCantidad = UnidadTarea | `rubro:${number}`;
export const rubroDeBase = (base?: string): number | null => (base && base.startsWith("rubro:") ? Number(base.slice(6)) || null : null);
export const BASES_CANTIDAD: Array<{ value: BaseCantidad; label: string }> = [
  { value: "u", label: "por mueble" },
  { value: "ml", label: "por ml de largo" },
  { value: "m2", label: "por m² de frente" },
  { value: "m3", label: "por m³ de volumen" },
];

export type RenglonReceta = {
  id: number;
  tareaId: number;
  // Paso entero: los renglones del mismo paso van en paralelo; el paso siguiente espera a que terminen todos.
  paso: number;
  // Cantidad de la tarea (en SU unidad) por cada unidad de la base. Ej.: cantear 3 ml por ml de largo.
  factor: number;
  // Ausente = la misma unidad que la tarea.
  base?: BaseCantidad;
  nota?: string;
};

export type TipoMueble = {
  id: number;
  nombre: string;
  descripcion?: string;
  receta: RenglonReceta[];
  // Medidas habituales, para arrancar la cuenta (metros).
  largo?: number;
  alto?: number;
  profundidad?: number;
  activa?: boolean;
};

// Un mueble concreto (en el presupuesto o en el trabajo): su tipo, cuantos y sus medidas en metros.
export type MuebleMedido = {
  tipoMuebleId: number;
  cantidad: number;
  largo?: number;
  alto?: number;
  profundidad?: number;
  // Correcciones a mano de la cantidad de un renglon (id de renglon → cantidad total en la unidad de la tarea).
  ajustes?: Record<number, number>;
  // Cantidades por rubro de materiales (id de rubro → cantidad), sacadas de lo cotizado para este mueble.
  materiales?: Record<number, number>;
};

// Lo cotizado de cada rubro en una lista de materiales (los de un bloque del presupuesto, por ejemplo).
export function cantidadesPorRubro(materiales: Array<{ description: string; qty: number }>, rubros: RubroFabricacion[]): Record<number, number> {
  const out: Record<number, number> = {};
  rubros
    .filter((r) => r.origen === "materiales" && r.activo !== false)
    .forEach((r) => {
      const total = materiales.filter((m) => coincideConRubro(m.description, r)).reduce((s, m) => s + (Number(m.qty) || 0), 0);
      if (total) out[r.id] = Math.round(total * 100) / 100;
    });
  return out;
}

// Los rubros de materiales que usa la receta (para pedir esas cantidades).
export const rubrosDeLaReceta = (tipo: Pick<TipoMueble, "receta">): number[] =>
  Array.from(new Set(tipo.receta.map((r) => rubroDeBase(r.base)).filter((x): x is number => x != null)));

const r2 = (n: number) => Math.round(n * 100) / 100;
const pos = (n: unknown) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0);

export function medidasDelMueble(m: Pick<MuebleMedido, "cantidad" | "largo" | "alto" | "profundidad">): Record<BaseCantidad, number> {
  const n = pos(m.cantidad) || 0;
  const l = pos(m.largo);
  const a = pos(m.alto);
  const p = pos(m.profundidad);
  return { u: n, ml: r2(n * l), m2: r2(n * l * a), m3: r2(n * l * a * p) };
}

// Orden de la receta: por paso y, dentro del paso, como esta en la lista. Devuelve la etiqueta "3.1".
export function recetaOrdenada(receta: RenglonReceta[]): Array<RenglonReceta & { etiqueta: string }> {
  const ordenada = receta.map((r, i) => ({ r, i })).sort((a, b) => a.r.paso - b.r.paso || a.i - b.i).map((x) => x.r);
  const cuenta = new Map<number, number>();
  ordenada.forEach((r) => cuenta.set(r.paso, (cuenta.get(r.paso) || 0) + 1));
  const visto = new Map<number, number>();
  return ordenada.map((r) => {
    const k = (visto.get(r.paso) || 0) + 1;
    visto.set(r.paso, k);
    return { ...r, etiqueta: (cuenta.get(r.paso) || 0) > 1 ? `${r.paso}.${k}` : String(r.paso) };
  });
}

export type TareaCalculada = {
  renglonId: number;
  tareaId: number;
  nombre: string;
  paso: number;
  etiqueta: string;
  unidad: UnidadTarea;
  cantidad: number;
  // true si la cantidad la corrigieron a mano.
  ajustada: boolean;
  horasPorUnidad: number;
  horas: number;
  // La tarea no tiene tiempo estandar cargado: el total queda corto.
  sinTiempo: boolean;
  // Sale de un rubro de materiales que este mueble no trae cargado (cantidad 0 hasta que se cargue).
  sinMaterial: boolean;
};

export function tareasDelMueble(tipo: TipoMueble, mueble: MuebleMedido, catalogo: TipoTarea[]): TareaCalculada[] {
  const medidas = medidasDelMueble(mueble);
  return recetaOrdenada(tipo.receta).map((r) => {
    const t = catalogo.find((x) => x.id === r.tareaId);
    const unidad = t?.unidad || "u";
    const base = r.base || unidad;
    const rubroId = rubroDeBase(base);
    const deMaterial = rubroId != null ? mueble.materiales?.[rubroId] : undefined;
    const medida = rubroId != null ? pos(deMaterial) : medidas[base as UnidadTarea] || 0;
    const ajuste = mueble.ajustes?.[r.id];
    const ajustada = ajuste != null && Number.isFinite(ajuste);
    const cantidad = r2(ajustada ? Number(ajuste) : pos(r.factor) * medida);
    const horasPorUnidad = pos(t?.horasEstimadas);
    return {
      renglonId: r.id,
      tareaId: r.tareaId,
      nombre: t?.nombre || "tarea borrada",
      paso: r.paso,
      etiqueta: r.etiqueta,
      unidad,
      cantidad,
      ajustada,
      horasPorUnidad,
      horas: r2(cantidad * horasPorUnidad),
      sinTiempo: !horasPorUnidad,
      sinMaterial: rubroId != null && deMaterial == null && !ajustada,
    };
  });
}

// Horas-hombre (todo sumado) y horas de reloj minimas: los renglones de un mismo paso van en paralelo (por
// distintas personas), asi que cada paso dura lo que su renglon mas largo; los pasos van uno detras del otro.
export function resumenDeTiempos(tareas: TareaCalculada[]): { horasHombre: number; horasReloj: number; pasos: Array<{ paso: number; horas: number; horasReloj: number }> } {
  const porPaso = new Map<number, TareaCalculada[]>();
  tareas.forEach((t) => porPaso.set(t.paso, [...(porPaso.get(t.paso) || []), t]));
  const pasos = Array.from(porPaso.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([paso, ts]) => ({ paso, horas: r2(ts.reduce((s, t) => s + t.horas, 0)), horasReloj: r2(Math.max(0, ...ts.map((t) => t.horas))) }));
  return {
    horasHombre: r2(pasos.reduce((s, p) => s + p.horas, 0)),
    horasReloj: r2(pasos.reduce((s, p) => s + p.horasReloj, 0)),
    pasos,
  };
}

// Puente con lo que ya habia: un grupo de trabajo se convierte en receta (cada tarea, un paso).
export function recetaDesdeTareas(tareaIds: number[], nuevoId: () => number): RenglonReceta[] {
  return tareaIds.map((tareaId, i) => ({ id: nuevoId(), tareaId, paso: i + 1, factor: 1 }));
}

// El paso que sigue al ultimo (para "+ Tarea" al final de la receta).
export const pasoSiguiente = (receta: RenglonReceta[]) => Math.max(0, ...receta.map((r) => r.paso)) + 1;
