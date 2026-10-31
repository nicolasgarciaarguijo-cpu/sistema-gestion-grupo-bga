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

import { idsDeGrupo, type GrupoTrabajo, type TipoTarea, type UnidadTarea } from "./organizacionDiaria";
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
  // El grupo de tareas del que vino (Nicolas, 2026-10-26: "el tipo de mueble determina el grupo de trabajos, y dentro
  // las tareas"). Sirve para actualizar la receta cuando el grupo cambia en el catalogo.
  grupoId?: number;
  // Horas de reloj de la tarea POR MUEBLE, hechas por la cuadrilla del tipo (Nicolas, 28/10/2026: "los tiempos que se
  // estipulan por tipo de mueble es teniendo en cuenta la cantidad de personas"). Ausente = cantidad x tiempo del catalogo.
  horas?: number;
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
  // MATERIALES DEL TIPO (Nicolas, 27/10/2026): cada tipo esta nombrado por su medida y lleva su lista fija de materiales
  // de Stock, por cada mueble. El % de desperdicio es editable: el del tipo vale para todos y cada material puede tener el suyo.
  materiales?: MaterialDelTipo[];
  desperdicioPct?: number;
  // CUADRILLA (Nicolas, 28/10/2026): "si el tipo de mueble solicita 2 personas, las tareas las hacen las 2". Vale para
  // todas sus tareas. Ausente = lo que diga cada tarea del catalogo (o 1).
  personas?: number;
};

// Generico (30/10/2026): nombre + unidad + grupo de Stock; stockItemId es solo el SUGERIDO (precio de referencia). Los
// viejos traen solo stockItemId: ver genericoDe.
export type MaterialDelTipo = { id: number; cantidad: number; desperdicioPct?: number; nombre?: string; unidad?: string; grupo?: string; stockItemId?: number };
export const DESPERDICIO_POR_DEFECTO = 10;

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
  // Duracion de la tarea (horas de reloj).
  horas: number;
  // Personas a la vez (1 si no se cargo) y horas-hombre = horas x personas.
  personas: number;
  horasHombre: number;
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
    // Las horas cargadas en el tipo (por mueble) le ganan al tiempo estandar del catalogo.
    const porMueble = r.horas != null && pos(r.horas) > 0;
    const horasPorUnidad = porMueble ? pos(r.horas) : pos(t?.horasEstimadas);
    const personas = Math.max(1, Math.round(pos(tipo.personas) || pos(t?.personas)) || 1);
    const horas = porMueble ? r2(pos(r.horas) * pos(mueble.cantidad)) : r2(cantidad * horasPorUnidad);
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
      horas,
      personas,
      horasHombre: r2(horas * personas),
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
    .map(([paso, ts]) => ({ paso, horas: r2(ts.reduce((s, t) => s + t.horasHombre, 0)), horasReloj: r2(Math.max(0, ...ts.map((t) => t.horas))) }));
  return {
    horasHombre: r2(pasos.reduce((s, p) => s + p.horas, 0)),
    horasReloj: r2(pasos.reduce((s, p) => s + p.horasReloj, 0)),
    pasos,
  };
}

// ---- GENTE QUE PIDE CADA TAREA (Nicolas, 28/10/2026) ---------------------------------------------------------
// "Si no hubiese esa cantidad de personas disponibles a la hora de preparar la organizacion diaria deberia avisarlo y
// revalorizar la duracion de la tarea de forma manual (falta un empleado, hay que ir sin aviso a una obra, una entrega
// urgente). Se debe avisar la cantidad de horas necesarias y la cantidad de personas para ver si hacemos horas extras."
// Una tarea del dia se reconoce por su TAREA (el grupo) aunque se haya elegido cualquiera de sus pasos.
export const claveTarea = (tareaId: number, catalogo: Array<Pick<TipoTarea, "id" | "grupoId">>): string => {
  const g = catalogo.find((t) => t.id === tareaId)?.grupoId;
  return g != null ? `g${g}` : `t${tareaId}`;
};

export type NecesidadDeTarea = { nombre: string; personas: number; horas: number; horasHombre: number };

// Lo que piden los muebles de un trabajo, por tarea: la cuadrilla mas grande que la pide y las horas de reloj sumadas.
export function necesidadPorTarea(muebles: MuebleMedido[], tipos: TipoMueble[], catalogo: TipoTarea[], grupos: GrupoTrabajo[] = []): Map<string, NecesidadDeTarea> {
  const out = new Map<string, NecesidadDeTarea>();
  muebles.forEach((m) => {
    const tipo = tipos.find((t) => t.id === m.tipoMuebleId);
    if (!tipo) return;
    tareasDelMueble(tipo, m, catalogo).forEach((t) => {
      const clave = claveTarea(t.tareaId, catalogo);
      const g = catalogo.find((x) => x.id === t.tareaId)?.grupoId;
      const nombre = (g != null && grupos.find((x) => x.id === g)?.nombre) || t.nombre;
      const prev = out.get(clave);
      out.set(clave, {
        nombre,
        personas: Math.max(prev?.personas || 0, t.personas),
        horas: r2((prev?.horas || 0) + t.horas),
        horasHombre: r2((prev?.horasHombre || 0) + t.horasHombre),
      });
    });
  });
  return out;
}

// Con menos gente de la que pide: las horas-hombre no cambian, la duracion se estira. Es una referencia para
// revalorizar a mano y decidir horas extras.
export function faltaDeGente(n: Pick<NecesidadDeTarea, "personas" | "horas" | "horasHombre">, hay: number): null | { faltan: number; horasConLaQueHay: number } {
  if (hay <= 0 || hay >= n.personas) return null;
  return { faltan: n.personas - hay, horasConLaQueHay: r2(n.horasHombre / hay) };
}

// Puente con lo que ya habia: un grupo de trabajo se convierte en receta (cada tarea, un paso).
export function recetaDesdeTareas(tareaIds: number[], nuevoId: () => number): RenglonReceta[] {
  return tareaIds.map((tareaId, i) => ({ id: nuevoId(), tareaId, paso: i + 1, factor: 1 }));
}

// El paso que sigue al ultimo (para "+ Tarea" al final de la receta).
export const pasoSiguiente = (receta: RenglonReceta[]) => Math.max(0, ...receta.map((r) => r.paso)) + 1;

// ---- GRUPOS DE TAREAS EN LA RECETA (Nicolas, 2026-10-26) ---------------------------------------------------
// "Hay tareas que son repetitivas en todos los tipos de muebles: armar un listado de grupos de tareas con sus tareas
// y asignarlos a los tipos de mueble". Asignar un grupo suma sus tareas al final, una por paso (despues se pueden
// poner en paralelo), marcadas con el grupo. Si el grupo cambia en el catalogo, se puede actualizar la receta.

// Las tareas de un grupo, en el orden del grupo (solo las activas).
export const tareasDelGrupo = (grupoId: number, catalogo: TipoTarea[], grupos: GrupoTrabajo[] = []): number[] =>
  idsDeGrupo(grupos.find((g) => g.id === grupoId) || { id: grupoId }, catalogo).filter((id) => catalogo.find((t) => t.id === id)?.activa !== false);

// Los grupos asignados, en el orden en que aparecen en la receta.
export function gruposDeLaReceta(receta: RenglonReceta[]): number[] {
  return Array.from(new Set(recetaOrdenada(receta).map((r) => r.grupoId).filter((g): g is number => g != null)));
}

export function agregarGrupo(receta: RenglonReceta[], grupoId: number, tareaIds: number[], nuevoId: () => number): RenglonReceta[] {
  const ya = new Set(receta.filter((r) => r.grupoId === grupoId).map((r) => r.tareaId));
  let paso = pasoSiguiente(receta);
  const nuevos = tareaIds.filter((id) => !ya.has(id)).map((tareaId) => ({ id: nuevoId(), tareaId, paso: paso++, factor: 1, grupoId }));
  return [...receta, ...nuevos];
}

// Que le falta a la receta del grupo (tareas nuevas en el catalogo) y que sobra (tareas que salieron del grupo).
export function diferenciasConGrupo(receta: RenglonReceta[], grupoId: number, tareaIds: number[]): { faltan: number[]; sobran: RenglonReceta[] } {
  const delGrupo = receta.filter((r) => r.grupoId === grupoId);
  const tiene = new Set(delGrupo.map((r) => r.tareaId));
  const debe = new Set(tareaIds);
  return { faltan: tareaIds.filter((id) => !tiene.has(id)), sobran: delGrupo.filter((r) => !debe.has(r.tareaId)) };
}

// Pone la receta al dia con el grupo: saca lo que ya no esta y suma lo nuevo justo despues de lo ultimo del grupo
// (corriendo los pasos que siguen). Lo que ya estaba conserva su paso, cantidad y base.
export function actualizarGrupo(receta: RenglonReceta[], grupoId: number, tareaIds: number[], nuevoId: () => number): RenglonReceta[] {
  const { faltan, sobran } = diferenciasConGrupo(receta, grupoId, tareaIds);
  const fuera = new Set(sobran.map((r) => r.id));
  let lista = receta.filter((r) => !fuera.has(r.id));
  if (!faltan.length) return lista;
  const delGrupo = lista.filter((r) => r.grupoId === grupoId);
  const desde = delGrupo.length ? Math.max(...delGrupo.map((r) => r.paso)) : pasoSiguiente(lista) - 1;
  lista = lista.map((r) => (r.paso > desde ? { ...r, paso: r.paso + faltan.length } : r));
  return [...lista, ...faltan.map((tareaId, i) => ({ id: nuevoId(), tareaId, paso: desde + 1 + i, factor: 1, grupoId }))];
}

export const quitarGrupo = (receta: RenglonReceta[], grupoId: number): RenglonReceta[] => receta.filter((r) => r.grupoId !== grupoId);

// ---- FICHA DEL TIPO: TILDAR LAS TAREAS (Nicolas, 27/10/2026) ------------------------------------------------
// En la ficha se tildan las TAREAS que lleva el tipo (en el codigo: grupos de trabajo, ej. Corte CNC). Su paso a paso
// (las tareas del grupo) es siempre el mismo: entra entero, no se destilda.
export function tildarGrupo(tipo: TipoMueble, grupoId: number, on: boolean, catalogo: TipoTarea[], grupos: GrupoTrabajo[], nuevoId: () => number): TipoMueble {
  if (!on) return { ...tipo, receta: quitarGrupo(tipo.receta, grupoId) };
  return { ...tipo, receta: agregarGrupo(tipo.receta, grupoId, tareasDelGrupo(grupoId, catalogo, grupos), nuevoId) };
}

// ---- MATERIALES DE LOS MUEBLES (Nicolas, 27/10/2026) --------------------------------------------------------
// Cantidad a comprar de un material del tipo, por mueble: la cantidad exacta mas su % de desperdicio.
export const desperdicioDe = (tipo: Pick<TipoMueble, "desperdicioPct">, m: MaterialDelTipo) =>
  Number(m.desperdicioPct ?? tipo.desperdicioPct ?? DESPERDICIO_POR_DEFECTO);
export const cantidadConDesperdicio = (tipo: Pick<TipoMueble, "desperdicioPct">, m: MaterialDelTipo) =>
  Number(m.cantidad || 0) * (1 + desperdicioDe(tipo, m) / 100);

export type ItemStockParaMateriales = { id: number; description: string; unit: string; unitPrice: number; code?: string; group?: string; location?: string; sortOrder?: number };

// MATERIAL GENERICO (Nicolas, 30/10/2026): "guarda la cantidad de material por rubro. Si coloco 4,2 m2 de placa, pudiendo
// ser melamina blanca o simil madera. 2 correderas, pudiendo ser telescopicas u ocultas". El tipo guarda nombre + unidad +
// grupo de Stock; el articulo concreto se elige al presupuestar entre los de ese grupo. El sugerido solo da un precio de
// referencia. Los cargados antes (solo stockItemId) valen como generico con el nombre, unidad y grupo de su articulo.
export type GenericoDelTipo = { nombre: string; unidad: string; grupo: string; sugeridoId?: number };
export function genericoDe(m: MaterialDelTipo, stock: ItemStockParaMateriales[]): GenericoDelTipo {
  const it = m.stockItemId != null ? stock.find((x) => x.id === m.stockItemId) : undefined;
  return { nombre: m.nombre || it?.description || "Material", unidad: m.unidad || it?.unit || "u", grupo: m.grupo ?? it?.group ?? "", sugeridoId: it?.id };
}
export const claveGenerico = (g: Pick<GenericoDelTipo, "nombre" | "grupo">) => `${g.grupo.trim().toLowerCase()}|${g.nombre.trim().toLowerCase()}`;

export type GenericoDelPresupuesto = GenericoDelTipo & { clave: string; qty: number };

// Los genericos que llevan los muebles del presupuesto, sumados (cantidad de muebles x cantidad con desperdicio). Si dos
// tipos sugieren articulos distintos para el mismo generico, queda el primero.
export function genericosDeLosMuebles(
  muebles: Array<{ tipoMuebleId: number; cantidad: number }>,
  tipos: TipoMueble[],
  stock: ItemStockParaMateriales[]
): GenericoDelPresupuesto[] {
  const porClave = new Map<string, GenericoDelPresupuesto>();
  muebles.forEach((mb) => {
    const tipo = tipos.find((t) => t.id === mb.tipoMuebleId);
    (tipo?.materiales || []).forEach((m) => {
      const g = genericoDe(m, stock);
      const clave = claveGenerico(g);
      const qty = Number(mb.cantidad || 0) * cantidadConDesperdicio(tipo!, m);
      const prev = porClave.get(clave);
      porClave.set(clave, prev ? { ...prev, qty: prev.qty + qty, sugeridoId: prev.sugeridoId ?? g.sugeridoId } : { ...g, clave, qty });
    });
  });
  return Array.from(porClave.values())
    .filter((g) => g.qty > 0)
    .map((g) => ({ ...g, qty: Math.round(g.qty * 1000) / 1000 }));
}

// ---- CONVERTIDOR DE MATERIALES (Nicolas, 30/10/2026) ---------------------------------------------------------
// "Tenemos que tener un convertidor establecido que se pueda calibrar: yo considero que la placa cuenta con 4,5 m2 y asi
// contabilizaremos siempre; la laca 0,3 L por cada m2 terminado y de fondo 0,2 por cada m2". El tipo dice cuanto material
// lleva en SU unidad (m2 de placa, m2 laqueados); el articulo de Stock se vende en otra (u = una placa, lt). Tres tablas:
//  1. EQUIVALENCIAS: pasan de la unidad del material a la del articulo.
//     - modo "contiene": 1 articulo contiene `valor` unidades del material (1 placa = 4,5 m2 → cantidad / 4,5).
//     - modo "consume": cada 1 unidad del material consume `valor` del articulo (1 m2 laqueado = 0,3 L → cantidad x 0,3).
//  2. COMPRA: "placas blancas o MDF son de compra intensiva, siempre voy a tener: queda el valor exacto con su desperdicio.
//     En otros casos se redondea para arriba. Las lacas de color se compran minimamente de a 3 L; superados los 3 L se
//     compra por litro". Sin regla = se redondea para arriba de a 1.
//  3. ACOMPAÑAN: "los catalizadores son unicos para todos los colores, se compran de a 1 L, aunque el calculo de uso siempre
//     sea la mitad de laca". Un material arrastra a otro en proporcion de su USO (antes de redondear).
// En las tres vale la regla mas puntual: la de un articulo, despues la del material, despues la del grupo de Stock. `contiene`
// filtra por palabras de la descripcion del articulo (todas tienen que estar: "laca color").
type AQuien = {
  material?: string; // nombre generico (Placa, Laca); vacio = cualquiera
  grupo?: string; // grupo de Stock; vacio = cualquiera
  articuloId?: number; // un articulo puntual (la mas fuerte)
  contiene?: string; // palabras de la descripcion del articulo
  // El CRITERIO, en palabras (Nicolas: "el bloque equivalencias y ahi las vamos dejando asentadas, equivalencias y criterios").
  nota?: string;
};
export type Equivalencia = AQuien & {
  id: number;
  unidadMaterial: string; // m2, ml, u
  unidadArticulo: string; // placa, L, u (solo para mostrar)
  modo: "contiene" | "consume";
  valor: number;
};
export type ReglaCompra = AQuien & {
  id: number;
  intensiva?: boolean; // compra intensiva: va el valor exacto (con desperdicio), sin redondear
  minimo?: number; // lo minimo que se compra (laca de color: 3)
  multiplo?: number; // de a cuanto se compra despues del minimo (default 1)
};
export type Acompanante = {
  id: number;
  material: string; // el que arrastra (Laca)
  agrega: string; // el que se suma (Catalizador)
  grupo?: string; // grupo de Stock del que se suma
  unidad: string; // unidad del que se suma (L)
  proporcion: number; // por cada 1 de uso del que arrastra (0,5)
  articuloId?: number; // sugerido
  nota?: string;
};
export type ConvertidorMateriales = { equivalencias: Equivalencia[]; compras: ReglaCompra[]; acompanantes: Acompanante[] };

export const CONVERTIDOR_POR_DEFECTO: ConvertidorMateriales = {
  equivalencias: [
    { id: 1, material: "Placa", unidadMaterial: "m2", unidadArticulo: "placa", modo: "contiene", valor: 4.5, nota: "La placa cuenta con 4,5 m² aprovechables: así se contabiliza siempre" },
    { id: 2, material: "Laca", unidadMaterial: "m2", unidadArticulo: "L", modo: "consume", valor: 0.3, nota: "0,3 L por cada m² terminado" },
    { id: 3, material: "Fondo", unidadMaterial: "m2", unidadArticulo: "L", modo: "consume", valor: 0.2, nota: "0,2 por cada m²" },
    { id: 4, material: "Catalizador", unidadMaterial: "L", unidadArticulo: "lata de 1 L", modo: "contiene", valor: 1, nota: "Se compra de a 1 L (a confirmar el tamaño de la lata)" },
  ],
  compras: [
    { id: 11, grupo: "MDF", intensiva: true, nota: "Compra intensiva: siempre se compra y siempre hay" },
    { id: 12, grupo: "Melaminas", contiene: "blanc", intensiva: true, nota: "Placas blancas: compra intensiva" },
    { id: 13, grupo: "Pinturas", contiene: "laca color", minimo: 3, multiplo: 1, nota: "Se compra el color para el trabajo: mínimo 3 L; pasados los 3 L, por litro" },
    { id: 14, grupo: "Pinturas", contiene: "laca incolora", intensiva: true, nota: "Se consigue en todos los formatos (1, 2, 3, 4, 5 L): compra intensiva" },
    { id: 15, grupo: "Pinturas", contiene: "laca blanca", intensiva: true, nota: "Se consigue en todos los formatos (1, 2, 3, 4, 5 L): compra intensiva" },
    { id: 16, grupo: "Pinturas", contiene: "laca negra", intensiva: true, nota: "Se consigue en todos los formatos (1, 2, 3, 4, 5 L): compra intensiva" },
  ],
  acompanantes: [{ id: 21, material: "Laca", agrega: "Catalizador", grupo: "Pinturas", unidad: "L", proporcion: 0.5, nota: "Único para todos los colores; el uso es siempre la mitad de la laca" }],
};
// Lo guardado puede no tener alguna de las tablas: esa vale la de Nicolas.
export const convertidorVigente = (c?: Partial<ConvertidorMateriales>): ConvertidorMateriales => ({
  equivalencias: c?.equivalencias ?? CONVERTIDOR_POR_DEFECTO.equivalencias,
  compras: c?.compras ?? CONVERTIDOR_POR_DEFECTO.compras,
  acompanantes: c?.acompanantes ?? CONVERTIDOR_POR_DEFECTO.acompanantes,
});

const normUnidad = (u?: string) => String(u || "").trim().toLowerCase().replace("²", "2").replace("³", "3").replace(/^lts?$|^litros?$/, "l");
const normTexto = (s?: string) => String(s || "").trim().toLowerCase();

// Cuanto le corresponde una regla a un material con su articulo (-1 = no le corresponde). Una regla sin a quien aplicar no
// vale para todo.
function puntaje(r: AQuien, nombre: string, it: Pick<ItemStockParaMateriales, "id" | "group" | "description"> | undefined): number {
  if (r.articuloId != null && r.articuloId !== it?.id) return -1;
  if (r.grupo && normTexto(r.grupo) !== normTexto(it?.group)) return -1;
  if (r.material && normTexto(r.material) !== normTexto(nombre)) return -1;
  // Cada palabra tiene que ser el COMIENZO de una palabra del articulo: "blanc" agarra blanco/blanca/Mont Blanc, y "color"
  // no agarra "incolora".
  if (r.contiene) {
    const palabras = normTexto(it?.description).split(/[^a-z0-9áéíóúñü]+/).filter(Boolean);
    if (!normTexto(r.contiene).split(/\s+/).filter(Boolean).every((p) => palabras.some((w) => w.startsWith(p)))) return -1;
  }
  if (r.articuloId == null && !r.material && !r.grupo && !r.contiene) return -1;
  return (r.articuloId != null ? 8 : 0) + (r.material ? 4 : 0) + (r.contiene ? 2 : 0) + (r.grupo ? 1 : 0);
}
function laMasPuntual<T extends AQuien>(reglas: T[], nombre: string, it: Pick<ItemStockParaMateriales, "id" | "group" | "description"> | undefined, extra: (r: T) => boolean = () => true): T | undefined {
  let mejor: { r: T; p: number } | undefined;
  reglas.forEach((r) => {
    const p = extra(r) ? puntaje(r, nombre, it) : -1;
    if (p >= 0 && (!mejor || p > mejor.p)) mejor = { r, p };
  });
  return mejor?.r;
}

// La equivalencia que corresponde a un generico con el articulo elegido, o ninguna.
export const equivalenciaPara = (g: Pick<GenericoDelTipo, "nombre" | "unidad">, it: Pick<ItemStockParaMateriales, "id" | "group" | "description"> | undefined, equivalencias: Equivalencia[]) =>
  laMasPuntual(equivalencias, g.nombre, it, (eq) => Number(eq.valor) > 0 && (!eq.unidadMaterial || normUnidad(eq.unidadMaterial) === normUnidad(g.unidad)));
export const reglaDeCompraPara = (nombre: string, it: Pick<ItemStockParaMateriales, "id" | "group" | "description"> | undefined, compras: ReglaCompra[]) => laMasPuntual(compras, nombre, it);

export const convertirCantidad = (cantidad: number, eq: Equivalencia | undefined) =>
  !eq ? cantidad : eq.modo === "contiene" ? cantidad / Number(eq.valor) : cantidad * Number(eq.valor);
const num = (n: number) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 3 });
export const textoEquivalencia = (eq: Equivalencia) =>
  eq.modo === "contiene" ? `1 ${eq.unidadArticulo || "artículo"} = ${num(eq.valor)} ${eq.unidadMaterial}` : `1 ${eq.unidadMaterial} = ${num(eq.valor)} ${eq.unidadArticulo || "del artículo"}`;

// Lo que se compra para un uso: exacto si es de compra intensiva; si no, para arriba, al menos el minimo y de a multiplo.
export function cantidadAComprar(uso: number, regla: ReglaCompra | undefined): number {
  if (!(uso > 0)) return 0;
  if (regla?.intensiva) return uso;
  const minimo = Number(regla?.minimo) > 0 ? Number(regla!.minimo) : 0;
  const multiplo = Number(regla?.multiplo) > 0 ? Number(regla!.multiplo) : 1;
  if (uso <= minimo) return minimo;
  // Pasado el minimo se sigue de a multiplo desde el minimo (3, 4, 5... con multiplo 1). El 1e-9 evita que 2.0000001 suba a 3.
  return minimo + Math.ceil((uso - minimo) / multiplo - 1e-9) * multiplo;
}
export const textoCompra = (r: ReglaCompra | undefined) =>
  r?.intensiva
    ? "compra intensiva: exacto"
    : `para arriba${Number(r?.minimo) > 0 ? `, mínimo ${num(r!.minimo!)}` : ""}${Number(r?.multiplo) > 0 && Number(r?.multiplo) !== 1 ? `, de a ${num(r!.multiplo!)}` : ""}`;

export type MaterialPasado = {
  generico: string;
  nombre: string;
  grupoGenerico: string;
  qtyGenerico: number; // en la unidad del material (m2 de placa)
  unidadGenerico: string;
  acompanaA?: string; // lo suma otro material (catalizador de la laca)
  stockItemId?: number;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  stockCode?: string;
  stockGroup?: string;
  stockLocation?: string;
  sortOrder?: number;
  uso: number; // lo que se usa, en la unidad del articulo (antes de redondear)
  qtyDelTipo: number; // lo que se compra segun el tipo y las reglas (antes de la correccion a mano)
  cantidadManual?: boolean;
  equivalencia?: string;
  compra: string;
  // El articulo va en otra unidad y no hay equivalencia cargada: la cantidad paso tal cual.
  sinEquivalencia?: string;
  sinPrecio?: boolean;
};

// Lo que pasa al bloque de materiales del presupuesto: cada generico (y los que arrastra) con el articulo ELEGIDO (o el
// sugerido), la cantidad del tipo pasada a la unidad del articulo y redondeada segun como se compra, y su precio de hoy. La
// cantidad se puede corregir a mano (Nicolas: "siempre debe existir la posibilidad de correccion manual por el momento"). Sin
// articulo, o con el articulo sin precio, queda en 0 y marcado: tiene que quedar bien claro que falta el precio.
export function materialesDeLosMuebles(
  muebles: Array<{ tipoMuebleId: number; cantidad: number }>,
  tipos: TipoMueble[],
  stock: ItemStockParaMateriales[],
  opciones: { elegidos?: Record<string, number | undefined>; cantidades?: Record<string, number | undefined>; convertidor?: Partial<ConvertidorMateriales> } = {}
): MaterialPasado[] {
  const { elegidos = {}, cantidades = {} } = opciones;
  const conv = convertidorVigente(opciones.convertidor);
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const articulo = (id?: number) => (id != null ? stock.find((x) => x.id === id) : undefined);

  // El uso de un generico en la unidad del articulo (sin articulo: con la equivalencia del material, si hay).
  const usoDe = (g: { nombre: string; unidad: string; grupo: string; qty: number }, it: ItemStockParaMateriales | undefined) => {
    if (it && normUnidad(it.unit) === normUnidad(g.unidad)) return { uso: g.qty };
    const eq = equivalenciaPara(g, it ?? { id: -1, group: g.grupo, description: "" }, conv.equivalencias);
    return { uso: convertirCantidad(g.qty, eq), eq, sinEq: it && !eq ? `${g.unidad} → ${it.unit}` : undefined };
  };

  const base = genericosDeLosMuebles(muebles, tipos, stock);
  // Los que arrastran otros (catalizador = la mitad del uso de laca), sumados por generico.
  const arrastrados = new Map<string, GenericoDelPresupuesto & { acompanaA: string }>();
  base.forEach((g) => {
    conv.acompanantes
      .filter((a) => Number(a.proporcion) > 0 && a.agrega && normTexto(a.material) === normTexto(g.nombre))
      .forEach((a) => {
        const { uso } = usoDe(g, articulo(elegidos[g.clave] ?? g.sugeridoId));
        const ng = { nombre: a.agrega, grupo: a.grupo || "", unidad: a.unidad || "u" };
        const clave = claveGenerico(ng);
        const prev = arrastrados.get(clave);
        const qty = uso * Number(a.proporcion);
        arrastrados.set(clave, prev ? { ...prev, qty: prev.qty + qty, acompanaA: `${prev.acompanaA}, ${g.nombre}` } : { ...ng, clave, qty, sugeridoId: a.articuloId, acompanaA: g.nombre });
      });
  });
  const todos: Array<GenericoDelPresupuesto & { acompanaA?: string }> = [...base, ...Array.from(arrastrados.values()).filter((a) => !base.some((b) => b.clave === a.clave))];

  return todos.map((g) => {
    const it = articulo(elegidos[g.clave] ?? g.sugeridoId);
    const { uso, eq, sinEq } = usoDe(g, it);
    const regla = reglaDeCompraPara(g.nombre, it, conv.compras);
    const delTipo = r3(cantidadAComprar(uso, regla));
    const manual = cantidades[g.clave];
    const precio = Number(it?.unitPrice || 0);
    const comun = {
      generico: g.clave,
      nombre: g.nombre,
      grupoGenerico: g.grupo,
      qtyGenerico: r3(g.qty),
      unidadGenerico: g.unidad,
      acompanaA: g.acompanaA,
      uso: r3(uso),
      qtyDelTipo: delTipo,
      qty: r3(manual != null ? manual : delTipo),
      cantidadManual: manual != null || undefined,
      equivalencia: eq ? textoEquivalencia(eq) : undefined,
      compra: textoCompra(regla),
    };
    if (!it) return { ...comun, description: `⚠ ${g.nombre}: SIN ARTÍCULO · FALTA PRECIO`, unit: eq?.unidadArticulo || g.unidad, unitPrice: 0, stockGroup: g.grupo || undefined, sinPrecio: true };
    return {
      ...comun,
      stockItemId: it.id,
      description: it.description,
      unit: it.unit,
      unitPrice: precio,
      stockCode: it.code,
      stockGroup: it.group,
      stockLocation: it.location,
      sortOrder: it.sortOrder,
      sinEquivalencia: sinEq,
      sinPrecio: !(precio > 0) || undefined,
    };
  });
}
