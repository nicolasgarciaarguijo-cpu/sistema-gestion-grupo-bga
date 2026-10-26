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
  // Es ayudante (de cualquier rumbo): puede ser el segundo en las tareas de 2 o mas personas.
  ayudante?: boolean;
};

export type AyudanteAsignado = { personaId: number | null; persona: string; costoHora: number };

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
  // Tareas de 2 o mas personas: los ayudantes (personaId null = falta un ayudante; se cotiza igual).
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
  // Tareas a las que les falta algun ayudante (no hay suficientes en el plantel).
  faltanAyudantes: AsignacionTarea[];
};

const EPS = 1e-9;

// Tareas de 2 o mas personas (Nicolas, 2026-10-26): "siempre es un especialista y se deben considerar como
// ayudantes solo a los ayudantes de cualquier espectro". El especialista es un idoneo que no es ayudante (si no
// hay, cualquier idoneo); los demas, ayudantes. Arrancan juntos: cuando el ultimo de ellos esta libre.
export function planificarMuebles(calculados: MuebleCalculado[], personas: PersonaParaCotizar[]): PlanDeMuebles {
  const libre = new Map<number, number>(personas.map((p) => [p.id, 0]));
  const libreDe = (p: PersonaParaCotizar) => libre.get(p.id) || 0;
  // Sin nadie idoneo se cotiza al costo hora mas alto del plantel; un ayudante que falta, al del ayudante mas caro.
  const peorCaso = Math.max(0, ...personas.map((p) => pos(p.costoHora)));
  const ayudantesTodos = personas.filter((p) => p.ayudante);
  const peorAyudante = ayudantesTodos.length ? Math.max(...ayudantesTodos.map((p) => pos(p.costoHora))) : peorCaso;
  type Estado = { c: MuebleCalculado; pasos: Array<{ paso: number; tareas: TareaCalculada[] }>; i: number; listo: number; pendientes: TareaCalculada[]; finPaso: number };
  const estados: Estado[] = calculados
    .filter((c) => c.tareas.some((t) => t.horas > 0))
    .map((c) => {
      const porPaso = new Map<number, TareaCalculada[]>();
      c.tareas.filter((t) => t.horas > 0).forEach((t) => porPaso.set(t.paso, [...(porPaso.get(t.paso) || []), t]));
      const pasos = Array.from(porPaso.entries()).sort((a, b) => a[0] - b[0]).map(([paso, tareas]) => ({ paso, tareas }));
      return { c, pasos, i: 0, listo: 0, pendientes: [...pasos[0].tareas], finPaso: 0 };
    });
  const asignaciones: AsignacionTarea[] = [];
  for (;;) {
    // La tarea que puede arrancar antes; a igualdad, la de mas horas-hombre primero (asi la toman los mejores).
    let elegido: { e: Estado; t: TareaCalculada } | null = null;
    estados.forEach((e) => {
      if (e.i >= e.pasos.length) return;
      e.pendientes.forEach((t) => {
        if (!elegido || e.listo < elegido.e.listo || (e.listo === elegido.e.listo && t.horasHombre > elegido.t.horasHombre)) elegido = { e, t };
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
    const ayudantesPara = (lider: PersonaParaCotizar | null) =>
      ayudantesTodos
        .filter((p) => !lider || p.id !== lider.id)
        .sort((a, b) => libreDe(a) - libreDe(b) || pos(b.costoHora) - pos(a.costoHora))
        .slice(0, cuantos - 1);
    (especialistas.length ? especialistas : [null]).forEach((lider) => {
      const ays = ayudantesPara(lider);
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
    const faltan = cuantos - 1 - ayudantes.length;
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
      ayudantes: [
        ...ayudantes.map((p) => ({ personaId: p.id, persona: p.nombre, costoHora: pos(p.costoHora) })),
        ...Array.from({ length: faltan }, () => ({ personaId: null, persona: "Ayudante que falta", costoHora: peorAyudante })),
      ],
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
    a.ayudantes.forEach((y) => sumar(y.personaId == null ? "falta-ayudante" : String(y.personaId), y.personaId, y.personaId == null ? "Ayudantes que faltan" : y.persona, y.costoHora, a.horas));
  });
  const lista = Array.from(porPersona.values()).sort((a, b) => (a.personaId == null ? 1 : 0) - (b.personaId == null ? 1 : 0) || b.costoHora - a.costoHora);
  return {
    asignaciones,
    horasReloj: r2(Math.max(0, ...asignaciones.map((a) => a.fin))),
    costo: Math.round(lista.reduce((s, p) => s + p.costo, 0) * 100) / 100,
    porPersona: lista,
    sinPersona: asignaciones.filter((a) => a.personaId == null),
    faltanAyudantes: asignaciones.filter((a) => a.ayudantes.some((y) => y.personaId == null)),
  };
}
