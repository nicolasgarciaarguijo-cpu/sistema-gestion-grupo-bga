import {
  CATEGORIAS_POR_DEFECTO,
  capacidadesDelEmpleado,
  categoriaPrincipal,
  categoriasEfectivas,
  coberturaDeTareas,
  hayCiclo,
  puedeHacer,
  tareasHeredadas,
  type CategoriaEmpleado,
} from "./categoriasEmpleado";

// Aprendiz (1) < Ayudante general (2) < Ayudante de fabricacion (3) < Armador general (4)
const cat: CategoriaEmpleado[] = [
  { id: 1, nombre: "Aprendiz", nivel: 1, incluye: [], tareaIds: [100] },
  { id: 2, nombre: "Ayudante general", nivel: 2, incluye: [1], tareaIds: [200] },
  { id: 4, nombre: "Ayudante de fabricación", nivel: 3, incluye: [2], tareaIds: [400] },
  { id: 9, nombre: "Armador general", nivel: 4, incluye: [4], tareaIds: [900, 200] },
  { id: 5, nombre: "Ayudante de instalación", nivel: 3, incluye: [2], tareaIds: [500] },
];

describe("categorias internas", () => {
  it("son acumulativas: la superior suma todas las de abajo", () => {
    expect(Array.from(categoriasEfectivas([9], cat)).sort()).toEqual([1, 2, 4, 9]);
  });

  it("prioriza las tareas nuevas (las de la categoria mas alta)", () => {
    const caps = capacidadesDelEmpleado([9], cat);
    expect(caps.map((x) => x.tareaId)).toEqual([200, 900, 400, 100]);
    // La 200 esta en Ayudante general y en Armador: vale la de Armador (nivel 4, tildada).
    expect(caps.find((x) => x.tareaId === 200)).toMatchObject({ prioridad: 4, heredada: false });
    expect(caps.find((x) => x.tareaId === 100)).toMatchObject({ prioridad: 1, heredada: true });
  });

  it("solo puede hacer lo de su categoria; sin categorias cargadas no se restringe", () => {
    expect(puedeHacer([4], 400, cat)).toBe(true);
    expect(puedeHacer([4], 500, cat)).toBe(false);
    expect(puedeHacer([], 500, cat)).toBe(true);
    expect(puedeHacer(undefined, 500, cat)).toBe(true);
  });

  it("una categoria pausada no da tareas", () => {
    const pausada = cat.map((x) => (x.id === 1 ? { ...x, activa: false } : x));
    expect(puedeHacer([9], 100, pausada)).toBe(false);
  });

  it("no se cuelga con ciclos y los detecta al editar", () => {
    const ciclo = cat.map((x) => (x.id === 1 ? { ...x, incluye: [9] } : x));
    expect(Array.from(categoriasEfectivas([1], ciclo)).sort()).toEqual([1, 2, 4, 9]);
    expect(hayCiclo(1, [9], cat)).toBe(true);
    expect(hayCiclo(9, [5], cat)).toBe(false);
  });

  it("principal = la tildada de mayor nivel; heredadas sin repetir las propias", () => {
    expect(categoriaPrincipal([2, 9], cat)?.nombre).toBe("Armador general");
    expect(tareasHeredadas(cat[3], cat).sort()).toEqual([100, 400]);
  });

  it("cobertura para contratar: quien puede hacer cada tarea", () => {
    const emps = [
      { id: 1, categoriasInternas: [9] },
      { id: 2, categoriasInternas: [5] },
      { id: 3 }, // sin cargar: no cuenta
    ];
    expect(coberturaDeTareas([900, 500, 200, 777], emps, cat)).toEqual([
      { tareaId: 900, empleadoIds: [1] },
      { tareaId: 500, empleadoIds: [2] },
      { tareaId: 200, empleadoIds: [1, 2] },
      { tareaId: 777, empleadoIds: [] },
    ]);
  });

  it("la lista de siempre trae las 22 categorias sin ciclos", () => {
    expect(CATEGORIAS_POR_DEFECTO).toHaveLength(22);
    CATEGORIAS_POR_DEFECTO.forEach((x) => expect(hayCiclo(x.id, x.incluye, CATEGORIAS_POR_DEFECTO)).toBe(false));
    expect(Array.from(categoriasEfectivas([10], CATEGORIAS_POR_DEFECTO)).sort((a, b) => a - b)).toEqual([1, 2, 4, 9, 10]);
  });
});
