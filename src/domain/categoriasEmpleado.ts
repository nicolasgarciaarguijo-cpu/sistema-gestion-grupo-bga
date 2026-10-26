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

export type CategoriaEmpleado = {
  id: number;
  nombre: string;
  // Escalon: a mas alto, mas nueva la tarea para el empleado (se prioriza al armar el cronograma).
  nivel: number;
  // Categorias inferiores que esta suma (lo acumulativo): Armador general incluye a Ayudante de
  // fabricacion, que incluye a Ayudante general, que incluye a Aprendiz.
  incluye: number[];
  // Tareas propias de la categoria (ids del catalogo de Fabricacion). Las heredadas no se repiten.
  tareaIds: number[];
  descripcion?: string;
  activa?: boolean;
};

// La lista de siempre. Se guarda recien al primer cambio (hasta ahi se muestra esta), como los rubros
// del Gantt. Los "incluye" son una propuesta: se corrigen en la solapa.
const c = (id: number, nombre: string, nivel: number, incluye: number[] = []): CategoriaEmpleado => ({ id, nombre, nivel, incluye, tareaIds: [] });
export const CATEGORIAS_POR_DEFECTO: CategoriaEmpleado[] = [
  c(1, "Aprendiz", 1),
  c(2, "Ayudante general", 2, [1]),
  c(3, "Ayudante de laqueado", 3, [2]),
  c(4, "Ayudante de fabricación", 3, [2]),
  c(5, "Ayudante de instalación", 3, [2]),
  c(6, "Ayudante de herrería", 3, [2]),
  c(7, "Instalador general", 4, [5]),
  c(8, "Instalador especializado", 5, [7]),
  c(9, "Armador general", 4, [4]),
  c(10, "Armador especializado", 5, [9]),
  c(11, "Mecanizador general", 4, [4]),
  c(12, "Mecanizador especializado", 5, [11]),
  c(13, "Terminaciones general", 4, [4]),
  c(14, "Terminaciones especializado", 5, [13]),
  c(15, "Laqueador general", 4, [3]),
  c(16, "Laqueador especializado", 5, [15]),
  c(17, "Enchapados general", 4, [4]),
  c(18, "Enchapados especializado", 5, [17]),
  c(19, "Responsable de fábrica", 6),
  c(20, "Responsable de obra", 6, [8]),
  c(21, "Herrero general", 4, [6]),
  c(22, "Herrero especializado", 5, [21]),
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
export function capacidadesDelEmpleado(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[]): Capacidad[] {
  const efectivas = categoriasEfectivas(tildadas, catalogo);
  const directas = new Set(tildadas || []);
  const porTarea = new Map<number, Capacidad>();
  activas(catalogo)
    .filter((cat) => efectivas.has(cat.id))
    .forEach((cat) =>
      cat.tareaIds.forEach((tareaId) => {
        const prev = porTarea.get(tareaId);
        if (!prev || cat.nivel > prev.prioridad) porTarea.set(tareaId, { tareaId, prioridad: cat.nivel, categoriaId: cat.id, heredada: !directas.has(cat.id) });
      })
    );
  return Array.from(porTarea.values()).sort((a, b) => b.prioridad - a.prioridad || a.tareaId - b.tareaId);
}

// Un empleado sin categorias cargadas todavia NO se restringe (si no, la organizacion diaria quedaria
// trabada hasta cargar a todos). Con categorias, solo lo que ellas dan.
export function puedeHacer(tildadas: number[] | undefined, tareaId: number, catalogo: CategoriaEmpleado[]): boolean {
  if (!tildadas || tildadas.length === 0) return true;
  return capacidadesDelEmpleado(tildadas, catalogo).some((x) => x.tareaId === tareaId);
}

export const tieneCategorias = (tildadas: number[] | undefined) => !!tildadas && tildadas.length > 0;

// La categoria "de cartel" del empleado: la tildada de mayor nivel.
export function categoriaPrincipal(tildadas: number[] | undefined, catalogo: CategoriaEmpleado[]): CategoriaEmpleado | undefined {
  const porId = new Map(activas(catalogo).map((x) => [x.id, x]));
  return (tildadas || [])
    .map((id) => porId.get(id))
    .filter((x): x is CategoriaEmpleado => !!x)
    .sort((a, b) => b.nivel - a.nivel || a.nombre.localeCompare(b.nombre))[0];
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
  empleados: Array<{ id: number; categoriasInternas?: number[] }>,
  catalogo: CategoriaEmpleado[]
): Cobertura[] {
  const caps = empleados
    .filter((e) => tieneCategorias(e.categoriasInternas))
    .map((e) => ({ id: e.id, tareas: new Set(capacidadesDelEmpleado(e.categoriasInternas, catalogo).map((x) => x.tareaId)) }));
  return tareaIds.map((tareaId) => ({ tareaId, empleadoIds: caps.filter((x) => x.tareas.has(tareaId)).map((x) => x.id) }));
}
