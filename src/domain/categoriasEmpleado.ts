// PERSONAL · CATEGORIAS INTERNAS (Nicolas, 2026-10-25). "Asignar al personal una categoria de empleado
// interna. Cada categoria debe poder ser editada y tener el listado de tareas que ese empleado puede
// realizar, relacionado con las tareas de fabricacion, para armar su organizacion diaria. El empleado solo
// puede realizar las tareas dentro de su categoria. Las categorias son ACUMULATIVAS: si crece a una
// superior es capaz de hacer las tareas nuevas y las viejas, priorizando las nuevas. Asi vamos a poder
// definir que puestos se requieren a la hora de contratar."
//
// No es la categoria del convenio (Employee.category, la que liquida): es la interna, de capacidades.
// Las tareas son las del catalogo de Fabricacion (TipoTarea), asi el mismo id viaja de la ficha del
// empleado a la organizacion diaria y, despues, al cronograma. Funciones puras.

// Ajuste de Nicolas (2026-10-26): no son 22 categorias sueltas sino ESCALONES. Aprendiz → Ayudante general →
// Ayudante especializado (la misma categoria, se elige un RUMBO) → el oficio (Armador, Instalador, Laqueador,
// Enchapador, Mecanizador, Herrero: mismo escalon, distinta area) → Responsable, el ultimo. Terminaciones no
// es un escalon: son HABILIDADES EXTRA de ciertas personas. Por dentro sigue siendo una categoria por
// escalon y rumbo (cada rumbo da tareas distintas), encadenadas con "incluye".
export type CategoriaEmpleado = {
  id: number;
  nombre: string;
  // Escalon: a mas alto, mas nueva la tarea para el empleado (se prioriza al armar el cronograma).
  nivel: number;
  // Categorias inferiores que esta suma (lo acumulativo): Armador incluye a Ayudante especializado de
  // Armado, que incluye a Ayudante general, que incluye a Aprendiz.
  incluye: number[];
  // Tareas propias de la categoria (ids del catalogo de Fabricacion). Las heredadas no se repiten.
  tareaIds: number[];
  // Rumbo / area dentro del escalon (Armado, Laqueado...). Sin rumbo = vale para todos.
  area?: string;
  // Habilidad extra (Terminaciones): no es escalon, se suma a cualquiera.
  extra?: boolean;
  descripcion?: string;
  activa?: boolean;
  // Categoria del GREMIO (la del convenio, la que liquida) a la que corresponde (Nicolas, 31/10/2026: "debo vincular las
  // categorias internas con las categorias reales, para saber cuando estan listos para recibir un aumento").
  categoriaGremio?: string;
};

// Los nombres de los escalones, del 1 para arriba (posicion = nivel). Editables: se suman, se renombran y
// se reordenan ("dame la posibilidad de edicion de todas formas"). Se guardan recien al primer cambio.
export const ESCALONES_POR_DEFECTO = ["Aprendiz", "Ayudante general", "Ayudante especializado", "Oficio", "Responsable"];
export const nombreEscalon = (nivel: number, escalones: string[] = ESCALONES_POR_DEFECTO) => escalones[nivel - 1] || `Escalón ${nivel}`;

// Cambiar el escalon `nivel` de lugar con el de al lado: los nombres y las categorias viajan juntos.
export function moverEscalon(escalones: string[], cats: CategoriaEmpleado[], nivel: number, d: -1 | 1): { escalones: string[]; categorias: CategoriaEmpleado[] } {
  const otro = nivel + d;
  if (otro < 1 || otro > escalones.length) return { escalones, categorias: cats };
  const nuevos = [...escalones];
  [nuevos[nivel - 1], nuevos[otro - 1]] = [nuevos[otro - 1], nuevos[nivel - 1]];
  return {
    escalones: nuevos,
    categorias: cats.map((c) => (c.extra ? c : c.nivel === nivel ? { ...c, nivel: otro } : c.nivel === otro ? { ...c, nivel } : c)),
  };
}

// Un escalon nuevo justo arriba de `nivel` (0 = el mas bajo): los de arriba suben uno.
export function insertarEscalon(escalones: string[], cats: CategoriaEmpleado[], despuesDe: number, nombre = "Escalón nuevo"): { escalones: string[]; categorias: CategoriaEmpleado[] } {
  const nuevos = [...escalones];
  nuevos.splice(despuesDe, 0, nombre);
  return { escalones: nuevos, categorias: cats.map((c) => (!c.extra && c.nivel > despuesDe ? { ...c, nivel: c.nivel + 1 } : c)) };
}

// Solo se quita un escalon vacio (sin categorias); los de arriba bajan uno.
export function quitarEscalon(escalones: string[], cats: CategoriaEmpleado[], nivel: number): { escalones: string[]; categorias: CategoriaEmpleado[] } | null {
  if (cats.some((c) => !c.extra && c.nivel === nivel)) return null;
  return { escalones: escalones.filter((_, i) => i !== nivel - 1), categorias: cats.map((c) => (!c.extra && c.nivel > nivel ? { ...c, nivel: c.nivel - 1 } : c)) };
}

// "Ayudante especializado · Laqueado": el rumbo se agrega cuando el nombre solo no alcanza (lo comparten
// varias categorias); "Laqueador" ya lo dice.
export function etiquetaCategoria(cat: CategoriaEmpleado, catalogo: CategoriaEmpleado[]): string {
  const repetido = !!cat.area && catalogo.some((x) => x.id !== cat.id && x.nombre === cat.nombre);
  return repetido ? `${cat.nombre} · ${cat.area}` : cat.nombre;
}

export const RUMBOS_POR_DEFECTO = ["Armado", "Mecanizado", "Enchapado", "Laqueado", "Instalación", "Herrería"];
const OFICIOS = ["Armador", "Mecanizador", "Enchapador", "Laqueador", "Instalador", "Herrero"];

// La lista de siempre. Se guarda recien al primer cambio (hasta ahi se muestra esta), como los rubros
// del Gantt. Todo se corrige en la solapa.
const c = (id: number, nombre: string, nivel: number, incluye: number[] = [], mas: Partial<CategoriaEmpleado> = {}): CategoriaEmpleado => ({ id, nombre, nivel, incluye, tareaIds: [], ...mas });
export const CATEGORIAS_POR_DEFECTO: CategoriaEmpleado[] = [
  c(1, "Aprendiz", 1),
  c(2, "Ayudante general", 2, [1]),
  // 3..8: Ayudante especializado, uno por rumbo.
  ...RUMBOS_POR_DEFECTO.map((area, i) => c(3 + i, "Ayudante especializado", 3, [2], { area })),
  // 9..14: el oficio de cada rumbo, que incluye a su ayudante especializado.
  ...OFICIOS.map((nombre, i) => c(9 + i, nombre, 4, [3 + i], { area: RUMBOS_POR_DEFECTO[i] })),
  // Responsables: tareas de CONTROL. Estan por encima de todo pero no heredan las tareas de abajo (si
  // ademas tiene un oficio, se tilda aparte).
  c(15, "Responsable de fábrica", 5),
  c(16, "Responsable de obra", 5),
  c(17, "Terminaciones general", 0, [], { extra: true }),
  c(18, "Terminaciones especializado", 0, [17], { extra: true }),
  // Los idoneos para el mantenimiento de maquinas (solapa Mantenimiento).
  c(19, "Mantenimiento de máquinas", 0, [], { extra: true }),
];

const activas = (catalogo: CategoriaEmpleado[]) => catalogo.filter((x) => x.activa !== false);

// Todas las categorias que alcanza un empleado: las tildadas y, en cascada, las que incluyen. A prueba de
// ciclos (si alguien carga A incluye B y B incluye A, no se cuelga).
export function categoriasEfectivas(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[]): Set<number> {
  const porId = new Map(activas(catalogo).map((x) => [x.id, x]));
  const out = new Set<number>();
  const pila = [...(tildadas || [])];
  while (pila.length) {
    const id = pila.pop() as number;
    if (out.has(id) || !porId.has(id)) continue;
    out.add(id);
    (porId.get(id)?.incluye || []).forEach((x) => pila.push(x));
  }
  return out;
}

export type Capacidad = {
  tareaId: number;
  // Nivel de la categoria mas alta que da la tarea: a mayor nivel, mas prioridad (la tarea "nueva").
  prioridad: number;
  categoriaId: number;
  // true si la da una categoria heredada (no una tildada directamente).
  heredada: boolean;
};

// Las tareas que puede hacer un empleado, de la mas nueva (prioritaria) a la mas vieja.
// TAREAS QUE DOMINA (Nicolas, 31/10/2026): "hay que seleccionar las tareas que domina. Hoy en dia no todos dominan todo y tienen
// la misma categoria." Con tareas dominadas marcadas, SOLO esas valen (aunque sean de una categoria que no tiene); la
// categoria dice donde esta, no lo que sabe. Sin ninguna marcada, como antes: las de sus categorias.
export function capacidadesDelEmpleado(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[], dominadas?: number[]): Capacidad[] {
  if (dominadas && dominadas.length) return capacidadesDominadas(tildadas, catalogo, dominadas);
  const efectivas = categoriasEfectivas(tildadas, catalogo);
  const directas = new Set(tildadas || []);
  const porTarea = new Map<number, Capacidad>();
  const alcanzadas = activas(catalogo).filter((cat) => efectivas.has(cat.id));
  // Las habilidades extra no son escalon: valen lo mismo que su escalon mas alto (son lo que lo distingue).
  const tope = Math.max(1, ...alcanzadas.filter((x) => !x.extra).map((x) => x.nivel));
  alcanzadas.forEach((cat) => {
    const prioridad = cat.extra ? tope : cat.nivel;
    cat.tareaIds.forEach((tareaId) => {
      const prev = porTarea.get(tareaId);
      if (!prev || prioridad > prev.prioridad) porTarea.set(tareaId, { tareaId, prioridad, categoriaId: cat.id, heredada: !directas.has(cat.id) });
    });
  });
  return Array.from(porTarea.values()).sort((a, b) => b.prioridad - a.prioridad || a.tareaId - b.tareaId);
}

// TAREA ENTERA (Nicolas, 28/10/2026: "convertilo a capacidades por tareas"): quien domina un paso de una Tarea domina la
// Tarea entera, con todo su paso a paso (los que se sumen despues tambien). Asi lo que estaba tildado por paso vale solo.
export function capacidadesPorTareaEntera(caps: Capacidad[], tipos: Array<{ id: number; grupoId?: number | null }>): Capacidad[] {
  const out = new Map(caps.map((c) => [c.tareaId, c]));
  caps.forEach((c) => {
    const g = tipos.find((t) => t.id === c.tareaId)?.grupoId;
    if (g == null) return;
    tipos
      .filter((t) => t.grupoId === g)
      .forEach((t) => {
        const prev = out.get(t.id);
        if (!prev || c.prioridad > prev.prioridad) out.set(t.id, { ...c, tareaId: t.id });
      });
  });
  return Array.from(out.values()).sort((a, b) => b.prioridad - a.prioridad || a.tareaId - b.tareaId);
}

// Un empleado sin categorias ni tareas dominadas cargadas todavia NO se restringe (si no, la organizacion diaria quedaria
// trabada hasta cargar a todos). Con algo cargado, solo lo que sabe.
export function puedeHacer(tildadas: number[] | undefined, tareaId: number, catalogo: CategoriaEmpleado[], dominadas?: number[]): boolean {
  if (!tieneCapacidades(tildadas, dominadas)) return true;
  return capacidadesDelEmpleado(tildadas, catalogo, dominadas).some((x) => x.tareaId === tareaId);
}

export const tieneCategorias = (tildadas: number[] | undefined) => !!tildadas && tildadas.length > 0;
export const tieneCapacidades = (tildadas: number[] | undefined, dominadas?: number[]) => tieneCategorias(tildadas) || !!dominadas?.length;

// Lo dominado como capacidades: la prioridad es la del escalon mas alto de SUS categorias que da la tarea; si ninguna de las
// suyas la da (domina algo de mas arriba), la del escalon mas bajo que la da en el catalogo.
function capacidadesDominadas(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[], dominadas: number[]): Capacidad[] {
  const propias = capacidadesDelEmpleado(tildadas, catalogo);
  const lasDan = (id: number) => activas(catalogo).filter((c) => !c.extra && c.tareaIds.includes(id)).sort((a, b) => a.nivel - b.nivel);
  return Array.from(new Set(dominadas))
    .map((tareaId) => {
      const p = propias.find((x) => x.tareaId === tareaId);
      if (p) return p;
      const c = lasDan(tareaId)[0];
      return { tareaId, prioridad: c?.nivel || 1, categoriaId: c?.id ?? 0, heredada: false };
    })
    .sort((a, b) => b.prioridad - a.prioridad || a.tareaId - b.tareaId);
}

// ---- DOMINIO DE TAREAS Y AUMENTOS (Nicolas, 31/10/2026) ---------------------------------------------------------
// "Se domina la Tarea" (entera): los pasos se guardan, pero dominar uno de una Tarea es dominar la Tarea (como en
// capacidadesPorTareaEntera). Una TAREA = el grupo del paso; un paso suelto vale solo.
type PasoConGrupo = { id: number; grupoId?: number | null };
const unidadDeTarea = (id: number, tipos: PasoConGrupo[]) => {
  const g = tipos.find((t) => t.id === id)?.grupoId;
  return g != null ? `g${g}` : `p${id}`;
};
export const dominaPaso = (dominadas: number[] | undefined, pasoId: number, tipos: PasoConGrupo[]) => {
  const u = unidadDeTarea(pasoId, tipos);
  return (dominadas || []).some((d) => unidadDeTarea(d, tipos) === u);
};
// Marcar o desmarcar una Tarea entera (todos sus pasos).
export function marcarTarea(dominadas: number[] | undefined, pasoIds: number[], on: boolean): number[] {
  const sin = (dominadas || []).filter((d) => !pasoIds.includes(d));
  return on ? [...sin, ...pasoIds] : sin;
}

// Avance de una categoria: de sus Tareas (propias y heredadas de las que incluye), cuantas domina. 100% = completa.
export type AvanceCategoria = { total: number; dominadas: number; completa: boolean; faltan: number[] };
export function avanceDeCategoria(cat: CategoriaEmpleado, catalogo: CategoriaEmpleado[], dominadas: number[] | undefined, tipos: PasoConGrupo[]): AvanceCategoria {
  const pasos = [...cat.tareaIds, ...tareasHeredadas(cat, catalogo)];
  const porUnidad = new Map<string, number>();
  pasos.forEach((p) => {
    const u = unidadDeTarea(p, tipos);
    if (!porUnidad.has(u)) porUnidad.set(u, p);
  });
  const faltan = Array.from(porUnidad.values()).filter((p) => !dominaPaso(dominadas, p, tipos));
  const total = porUnidad.size;
  return { total, dominadas: total - faltan.length, completa: total > 0 && faltan.length === 0, faltan };
}

// LISTO PARA AUMENTO: domina el 100% de una categoria interna vinculada a una categoria del gremio que paga MAS que la que
// cobra (por el valor de la escala del mes). Puede pasar con varias (alguien de categoria baja que domina todo): va la mas alta.
export type ListoParaAumento = { categoria: CategoriaEmpleado; gremio: string; valor: number; actual: string; valorActual: number };
export function listoParaAumento(
  dominadas: number[] | undefined,
  categoriaActual: string,
  catalogo: CategoriaEmpleado[],
  tipos: PasoConGrupo[],
  valorGremio: (categoria: string) => number
): ListoParaAumento | null {
  if (!dominadas?.length) return null;
  const valorActual = valorGremio(categoriaActual);
  const candidatas = activas(catalogo)
    .filter((c) => c.categoriaGremio && avanceDeCategoria(c, catalogo, dominadas, tipos).completa)
    .map((c) => ({ categoria: c, gremio: c.categoriaGremio as string, valor: valorGremio(c.categoriaGremio as string) }))
    .filter((x) => x.valor > valorActual)
    .sort((a, b) => b.valor - a.valor || b.categoria.nivel - a.categoria.nivel);
  return candidatas[0] ? { ...candidatas[0], actual: categoriaActual, valorActual } : null;
}

// La categoria "de cartel" del empleado: la tildada de mayor escalon (las habilidades extra no cuentan).
export function categoriaPrincipal(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[]): CategoriaEmpleado | undefined {
  const porId = new Map(activas(catalogo).map((x) => [x.id, x]));
  return (tildadas || [])
    .map((id) => porId.get(id))
    .filter((x): x is CategoriaEmpleado => !!x && !x.extra)
    .sort((a, b) => b.nivel - a.nivel || a.nombre.localeCompare(b.nombre))[0];
}

// Rumbos del empleado (las areas de lo que alcanza) y sus habilidades extra.
export function rumbosDelEmpleado(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[]): string[] {
  const ef = categoriasEfectivas(tildadas, catalogo);
  return Array.from(new Set(activas(catalogo).filter((x) => ef.has(x.id) && !x.extra && x.area).map((x) => x.area as string)));
}
export function extrasDelEmpleado(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[]): CategoriaEmpleado[] {
  const ef = categoriasEfectivas(tildadas, catalogo);
  return activas(catalogo).filter((x) => ef.has(x.id) && !!x.extra);
}

// Tareas heredadas de una categoria (las de las inferiores que incluye), sin las propias.
export function tareasHeredadas(cat: CategoriaEmpleado, catalogo: CategoriaEmpleado[]): number[] {
  const efectivas = categoriasEfectivas(cat.incluye, catalogo);
  const propias = new Set(cat.tareaIds);
  const out = new Set<number>();
  activas(catalogo).forEach((x) => efectivas.has(x.id) && x.id !== cat.id && x.tareaIds.forEach((t) => !propias.has(t) && out.add(t)));
  return Array.from(out);
}

// Si "incluye" arma un ciclo (A incluye B que incluye A), para avisar al editar.
export function hayCiclo(catId: number, incluye: number[], catalogo: CategoriaEmpleado[]): boolean {
  const otro = catalogo.map((x) => (x.id === catId ? { ...x, incluye, activa: true } : { ...x, activa: true }));
  return incluye.some((id) => categoriasEfectivas([id], otro).has(catId));
}

// PARA CONTRATAR: por tarea, quienes la pueden hacer. Las que no tienen a nadie (o a uno solo) son el
// puesto que falta cubrir. Solo cuenta a los empleados con categorias cargadas.
export type Cobertura = { tareaId: number; empleadoIds: number[] };
export function coberturaDeTareas(
  tareaIds: number[],
  empleados: Array<{ id: number; categoriasInternas?: number[]; tareasDominadas?: number[] }>,
  catalogo: CategoriaEmpleado[]
): Cobertura[] {
  const caps = empleados
    .filter((e) => tieneCapacidades(e.categoriasInternas, e.tareasDominadas))
    .map((e) => ({ id: e.id, tareas: new Set(capacidadesDelEmpleado(e.categoriasInternas, catalogo, e.tareasDominadas).map((x) => x.tareaId)) }));
  return tareaIds.map((tareaId) => ({ tareaId, empleadoIds: caps.filter((x) => x.tareas.has(tareaId)).map((x) => x.id) }));
}
