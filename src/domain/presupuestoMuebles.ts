// PRESUPUESTAR POR TIPO DE MUEBLE (fase 3, Nicolas 2026-10-26). Cada bloque del presupuesto lleva su lista de
// muebles: tipo, cuantos y medidas. Las horas salen de la receta del tipo (ver domain/tiposMueble): las
// tareas por medida usan las medidas, y las que salen de materiales usan lo cotizado en el bloque. Si dos
// muebles usan el mismo rubro, lo cotizado se reparte entre ellos segun la cantidad; a mano se puede fijar
// la cantidad de un rubro para un mueble (y eso se descuenta de lo que se reparte entre los demas).
// Las horas pasan a la mano de obra del bloque repartidas entre sus categorias.
import type { RubroFabricacion } from "./ganttFabricacion";
import type { TipoTarea } from "./organizacionDiaria";
import { cantidadesPorRubro, resumenDeTiempos, rubrosDeLaReceta, tareasDelMueble, type MuebleMedido, type TareaCalculada, type TipoMueble } from "./tiposMueble";

export type MuebleDelPresupuesto = MuebleMedido & {
  id: number;
  // Como se lo nombra en este presupuesto ("Bajo mesada cocina"). Vacio = el nombre del tipo.
  nombre?: string;
};

export type MuebleCalculado = {
  mueble: MuebleDelPresupuesto;
  tipo?: TipoMueble;
  materiales: Record<number, number>;
  materialesAMano: number[];
  tareas: TareaCalculada[];
  horasHombre: number;
  horasReloj: number;
  incompleto: boolean;
};

export type ResumenMueblesPresupuesto = {
  muebles: MuebleCalculado[];
  horasHombre: number;
  // El mueble mas largo de hacer (los muebles distintos pueden ir en paralelo).
  horasRelojMax: number;
  porTarea: Array<{ tareaId: number; nombre: string; horas: number }>;
  incompleto: boolean;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const pos = (n: unknown) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0);

// Cantidad de cada rubro para cada mueble: lo fijado a mano manda; el resto de lo cotizado se reparte
// entre los muebles que usan ese rubro y no lo tienen fijado, segun cuantos son.
export function materialesDeCadaMueble(
  muebles: MuebleDelPresupuesto[],
  tipos: TipoMueble[],
  cotizadoPorRubro: Record<number, number>
): Map<number, { materiales: Record<number, number>; aMano: number[] }> {
  const out = new Map<number, { materiales: Record<number, number>; aMano: number[] }>();
  muebles.forEach((m) => out.set(m.id, { materiales: {}, aMano: [] }));
  const rubros = new Set<number>();
  const usa = new Map<number, number[]>();
  muebles.forEach((m) => {
    const tipo = tipos.find((t) => t.id === m.tipoMuebleId);
    usa.set(m.id, tipo ? rubrosDeLaReceta(tipo) : []);
    (usa.get(m.id) || []).forEach((r) => rubros.add(r));
  });
  rubros.forEach((rubro) => {
    const usan = muebles.filter((m) => (usa.get(m.id) || []).includes(rubro));
    const fijos = usan.filter((m) => m.materiales?.[rubro] != null && Number.isFinite(Number(m.materiales[rubro])));
    const libres = usan.filter((m) => !fijos.includes(m));
    fijos.forEach((m) => {
      const o = out.get(m.id)!;
      o.materiales[rubro] = pos(m.materiales![rubro]);
      o.aMano.push(rubro);
    });
    const resto = Math.max(0, pos(cotizadoPorRubro[rubro]) - fijos.reduce((s, m) => s + pos(m.materiales![rubro]), 0));
    const unidades = libres.reduce((s, m) => s + pos(m.cantidad), 0);
    if (!resto || !unidades) return;
    libres.forEach((m) => {
      out.get(m.id)!.materiales[rubro] = r2((resto * pos(m.cantidad)) / unidades);
    });
  });
  return out;
}

export function calcularMueblesDelPresupuesto(
  muebles: MuebleDelPresupuesto[],
  tipos: TipoMueble[],
  catalogo: TipoTarea[],
  materialesCotizados: Array<{ description: string; qty: number }>,
  rubros: RubroFabricacion[]
): ResumenMueblesPresupuesto {
  const cotizado = cantidadesPorRubro(materialesCotizados, rubros);
  const reparto = materialesDeCadaMueble(muebles, tipos, cotizado);
  const calculados: MuebleCalculado[] = muebles.map((m) => {
    const tipo = tipos.find((t) => t.id === m.tipoMuebleId);
    const { materiales, aMano } = reparto.get(m.id) || { materiales: {}, aMano: [] };
    if (!tipo) return { mueble: m, materiales, materialesAMano: aMano, tareas: [], horasHombre: 0, horasReloj: 0, incompleto: true };
    const tareas = tareasDelMueble(tipo, { ...m, materiales }, catalogo);
    const { horasHombre, horasReloj } = resumenDeTiempos(tareas);
    return { mueble: m, tipo, materiales, materialesAMano: aMano, tareas, horasHombre, horasReloj, incompleto: tareas.some((t) => t.sinTiempo || t.sinMaterial) };
  });
  const porTarea = new Map<number, { tareaId: number; nombre: string; horas: number }>();
  calculados.forEach((c) =>
    c.tareas.forEach((t) => {
      const prev = porTarea.get(t.tareaId) || { tareaId: t.tareaId, nombre: t.nombre, horas: 0 };
      porTarea.set(t.tareaId, { ...prev, horas: r2(prev.horas + t.horas) });
    })
  );
  return {
    muebles: calculados,
    horasHombre: r2(calculados.reduce((s, c) => s + c.horasHombre, 0)),
    horasRelojMax: r2(Math.max(0, ...calculados.map((c) => c.horasReloj))),
    porTarea: Array.from(porTarea.values()).sort((a, b) => b.horas - a.horas),
    incompleto: calculados.some((c) => c.incompleto),
  };
}

// Reparte las horas entre las categorias de mano de obra del bloque segun cuanta gente tiene cada una
// (sin gente cargada, en partes iguales). Devuelve las filas con sus horas de trabajo nuevas.
export function repartirHorasEnManoDeObra<T extends { id: number; employees: number; jobHours: number }>(labor: T[], horas: number): T[] {
  if (!labor.length) return labor;
  const gente = labor.reduce((s, l) => s + pos(l.employees), 0);
  const pesos = labor.map((l) => (gente ? pos(l.employees) / gente : 1 / labor.length));
  let asignado = 0;
  return labor.map((l, i) => {
    const h = i === labor.length - 1 ? r2(horas - asignado) : r2(horas * pesos[i]);
    asignado = r2(asignado + h);
    return { ...l, jobHours: Math.max(0, h) };
  });
}
