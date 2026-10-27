// PRESUPUESTAR POR TIPO DE MUEBLE (fase 3, Nicolas 2026-10-26). Cada bloque del presupuesto lleva su lista de
// muebles: tipo, cuantos y medidas. Las horas salen de la receta del tipo (ver domain/tiposMueble): las
// tareas por medida usan las medidas, y las que salen de materiales usan lo cotizado en el bloque. Si dos
// muebles usan el mismo rubro, lo cotizado se reparte entre ellos segun la cantidad; a mano se puede fijar
// la cantidad de un rubro para un mueble (y eso se descuenta de lo que se reparte entre los demas).
// Las horas pasan a la mano de obra por persona: ver planificarMuebles (quien hace cada tarea).
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
      porTarea.set(t.tareaId, { ...prev, horas: r2(prev.horas + t.horasHombre) });
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

// ---- QUIEN HACE CADA TAREA (Nicolas, 2026-10-26) --------------------------------------------------------
// "Las horas se deben asignar por empleado que pueda realizar la tarea, siempre considerando que el mas costoso
// es quien la va a llevar a cabo... los mejores haciendo las tareas, pero optimizando los tiempos para que salga
// lo mas rapido posible". Para cotizar no se mira el resto de la fabrica (como si fuera el unico trabajo).
// Regla: cada tarea va a quien la termina antes entre los idoneos; si empatan (estan todos libres), al de costo
// hora mas alto. Asi arrancan los mejores, y una tarea en paralelo pasa al siguiente mejor solo si el primero
// esta ocupado. Los pasos de un mueble van en orden (el 3 espera al 2 entero); muebles distintos van en paralelo.

export type PersonaParaCotizar = {
  id: number;
  nombre: string;
  costoHora: number;
  // Tareas del catalogo que puede hacer (de sus categorias internas).
  tareas: number[];
  // Por su categoria INTERNA (el escalon mas alto que tiene tildado): aprendiz o ayudante de cualquier rumbo.
  // Son los ayudantes de las tareas de 2 o mas personas. Nada que ver con la categoria de contratacion.
  ayudante?: boolean;
  // Escalon interno mas alto (1 = aprendiz...). Sirve para saber que tareas son mas complejas.
  nivel?: number;
};

// especialista = un especialista haciendo de ayudante porque no alcanzaron los ayudantes (para evaluar contratar uno).
export type AyudanteAsignado = { personaId: number; persona: string; costoHora: number; especialista?: boolean };

export type AsignacionTarea = {
  muebleId: number;
  renglonId: number;
  tareaId: number;
  nombre: string;
  etiqueta: string;
  // Duracion (reloj). Cada persona de la tarea pone estas horas.
  horas: number;
  personaId: number | null;
  persona: string;
  costoHora: number;
  // Tareas de 2 o mas personas: los ayudantes.
  ayudantes: AyudanteAsignado[];
  inicio: number;
  fin: number;
};

export type PlanDeMuebles = {
  asignaciones: AsignacionTarea[];
  horasReloj: number;
  costo: number;
  porPersona: Array<{ personaId: number | null; nombre: string; horas: number; costoHora: number; costo: number }>;
  sinPersona: AsignacionTarea[];
  // Lo que tardaria si nunca hubiera que esperar a alguien ocupado (solo la receta): la diferencia con horasReloj
  // es lo que se estira la fabricacion por la gente que hay.
  horasRelojSinEsperas: number;
  // Especialistas haciendo de ayudante (no alcanzaron los ayudantes): horas en total, para evaluar contratar uno.
  especialistasDeAyudante: { tareas: AsignacionTarea[]; horas: number };
};

const EPS = 1e-9;

// Tareas de 2 o mas personas (Nicolas, 2026-10-26): siempre las encabeza un especialista (un idoneo que no es
// aprendiz ni ayudante; si no hay, cualquier idoneo). Los demas son ayudantes: aprendices o ayudantes de cualquier
// rumbo, por categoria INTERNA. Si no hay ayudantes libres, completa un especialista libre (el menos caro) y se avisa:
// "un especialista esta haciendo tareas de ayudante, asi consideramos la contratacion de uno". Arrancan juntos.
// "Siempre el especialista debe hacer las tareas mas complejas": entre las tareas que pueden arrancar a la vez,
// primero se asignan las que solo saben hacer los escalones mas altos.
// "El plantel entero siempre va a alcanzar. Lo que pasaria es que se estiran los tiempos de fabricacion": si no hay
// gente libre, la tarea espera a que se libere. Asi se conocen los tiempos de fabricacion reales con este personal.
// `liberacion`: desde que hora (de trabajo, contando desde hoy) puede arrancar cada mueble (el inicio de su trabajo).
export function planificarMuebles(calculados: MuebleCalculado[], personas: PersonaParaCotizar[], liberacion: Record<number, number> = {}): PlanDeMuebles {
  const libre = new Map<number, number>(personas.map((p) => [p.id, 0]));
  const libreDe = (p: PersonaParaCotizar) => libre.get(p.id) || 0;
  // Sin nadie idoneo se cotiza al costo hora mas alto del plantel; un ayudante que falta, al del ayudante mas caro.
  const peorCaso = Math.max(0, ...personas.map((p) => pos(p.costoHora)));
  // Complejidad de una tarea: el escalon mas bajo de quienes la saben hacer (si solo la sabe un oficial, es compleja).
  const complejidad = new Map<number, number>();
  personas.forEach((p) => p.tareas.forEach((id) => complejidad.set(id, Math.min(complejidad.get(id) ?? Infinity, pos(p.nivel)))));
  const complejidadDe = (id: number) => (Number.isFinite(complejidad.get(id)) ? (complejidad.get(id) as number) : 0);
  type Estado = { c: MuebleCalculado; pasos: Array<{ paso: number; tareas: TareaCalculada[] }>; i: number; listo: number; pendientes: TareaCalculada[]; finPaso: number };
  const estados: Estado[] = calculados
    .filter((c) => c.tareas.some((t) => t.horas > 0))
    .map((c) => {
      const porPaso = new Map<number, TareaCalculada[]>();
      c.tareas.filter((t) => t.horas > 0).forEach((t) => porPaso.set(t.paso, [...(porPaso.get(t.paso) || []), t]));
      const pasos = Array.from(porPaso.entries()).sort((a, b) => a[0] - b[0]).map(([paso, tareas]) => ({ paso, tareas }));
      const desde = Math.max(0, liberacion[c.mueble.id] || 0);
      return { c, pasos, i: 0, listo: desde, pendientes: [...pasos[0].tareas], finPaso: desde };
    });
  const asignaciones: AsignacionTarea[] = [];
  for (;;) {
    // La tarea que puede arrancar antes; a igualdad, la mas compleja y despues la de mas horas-hombre (asi los
    // especialistas quedan para lo dificil).
    let elegido: { e: Estado; t: TareaCalculada } | null = null;
    const antes = (e: Estado, t: TareaCalculada, o: { e: Estado; t: TareaCalculada }) =>
      e.listo < o.e.listo - EPS ||
      (Math.abs(e.listo - o.e.listo) < EPS &&
        (complejidadDe(t.tareaId) > complejidadDe(o.t.tareaId) || (complejidadDe(t.tareaId) === complejidadDe(o.t.tareaId) && t.horasHombre > o.t.horasHombre)));
    estados.forEach((e) => {
      if (e.i >= e.pasos.length) return;
      e.pendientes.forEach((t) => {
        if (!elegido || antes(e, t, elegido)) elegido = { e, t };
      });
    });
    if (!elegido) break;
    const { e, t } = elegido as { e: Estado; t: TareaCalculada };
    const cuantos = Math.max(1, t.personas || 1);
    const idoneos = personas.filter((p) => p.tareas.includes(t.tareaId));
    const especialistas = cuantos > 1 && idoneos.some((p) => !p.ayudante) ? idoneos.filter((p) => !p.ayudante) : idoneos;
    // Para cada especialista posible, los ayudantes que antes se liberan (a igualdad, los mas caros) y cuando
    // pueden arrancar todos juntos. Gana el que arranca antes; a igualdad, el especialista mas caro.
    let mejor: { lider: PersonaParaCotizar | null; ayudantes: PersonaParaCotizar[]; inicio: number } | null = null;
    // Ayudantes: primero los aprendices/ayudantes que estan libres para arrancar con el especialista (a igualdad,
    // los mas caros); si no alcanzan, especialistas libres (el menos caro primero); si nadie esta libre, el que
    // antes se libere.
    const ayudantesPara = (lider: PersonaParaCotizar | null) => {
      const t0 = Math.max(e.listo, lider ? libreDe(lider) : 0);
      const llega = (p: PersonaParaCotizar) => Math.max(t0, libreDe(p));
      return personas
        .filter((p) => !lider || p.id !== lider.id)
        .sort(
          (a, b) =>
            llega(a) - llega(b) ||
            (a.ayudante ? 0 : 1) - (b.ayudante ? 0 : 1) ||
            (a.ayudante ? pos(b.costoHora) - pos(a.costoHora) : pos(a.costoHora) - pos(b.costoHora))
        )
        .slice(0, cuantos - 1);
    };
    (especialistas.length ? especialistas : [null]).forEach((lider) => {
      const ays = cuantos > 1 ? ayudantesPara(lider) : [];
      const inicio = Math.max(e.listo, lider ? libreDe(lider) : 0, ...ays.map(libreDe));
      if (
        !mejor ||
        inicio < mejor.inicio - EPS ||
        (Math.abs(inicio - mejor.inicio) < EPS && pos(lider?.costoHora) > pos(mejor.lider?.costoHora))
      )
        mejor = { lider, ayudantes: ays, inicio };
    });
    const { lider, ayudantes, inicio } = mejor as unknown as { lider: PersonaParaCotizar | null; ayudantes: PersonaParaCotizar[]; inicio: number };
    const fin = r2(inicio + t.horas);
    if (lider) libre.set(lider.id, fin);
    ayudantes.forEach((p) => libre.set(p.id, fin));
    asignaciones.push({
      muebleId: e.c.mueble.id,
      renglonId: t.renglonId,
      tareaId: t.tareaId,
      nombre: t.nombre,
      etiqueta: t.etiqueta,
      horas: t.horas,
      personaId: lider ? lider.id : null,
      persona: lider ? lider.nombre : "Nadie sabe hacerla",
      costoHora: lider ? pos(lider.costoHora) : peorCaso,
      ayudantes: ayudantes.map((p) => ({ personaId: p.id, persona: p.nombre, costoHora: pos(p.costoHora), especialista: !p.ayudante })),
      inicio: r2(inicio),
      fin,
    });
    e.pendientes = e.pendientes.filter((x) => x !== t);
    e.finPaso = Math.max(e.finPaso, fin);
    if (!e.pendientes.length) {
      e.i += 1;
      e.listo = e.finPaso;
      e.pendientes = e.i < e.pasos.length ? [...e.pasos[e.i].tareas] : [];
    }
  }
  const porPersona = new Map<string, { personaId: number | null; nombre: string; horas: number; costoHora: number; costo: number }>();
  const sumar = (clave: string, personaId: number | null, nombre: string, costoHora: number, horas: number) => {
    const prev = porPersona.get(clave) || { personaId, nombre, horas: 0, costoHora, costo: 0 };
    porPersona.set(clave, { ...prev, horas: r2(prev.horas + horas), costo: Math.round((prev.costo + horas * costoHora) * 100) / 100 });
  };
  asignaciones.forEach((a) => {
    sumar(a.personaId == null ? "sin-idoneo" : String(a.personaId), a.personaId, a.persona, a.costoHora, a.horas);
    a.ayudantes.forEach((y) => sumar(String(y.personaId), y.personaId, y.persona, y.costoHora, a.horas));
  });
  const lista = Array.from(porPersona.values()).sort((a, b) => (a.personaId == null ? 1 : 0) - (b.personaId == null ? 1 : 0) || b.costoHora - a.costoHora);
  return {
    asignaciones,
    horasReloj: r2(Math.max(0, ...asignaciones.map((a) => a.fin))),
    costo: Math.round(lista.reduce((s, p) => s + p.costo, 0) * 100) / 100,
    porPersona: lista,
    sinPersona: asignaciones.filter((a) => a.personaId == null),
    horasRelojSinEsperas: r2(Math.max(0, ...calculados.map((c) => c.horasReloj))),
    especialistasDeAyudante: (() => {
      const tareas = asignaciones.filter((a) => a.ayudantes.some((y) => y.especialista));
      return { tareas, horas: r2(tareas.reduce((s, a) => s + a.horas * a.ayudantes.filter((y) => y.especialista).length, 0)) };
    })(),
  };
}
