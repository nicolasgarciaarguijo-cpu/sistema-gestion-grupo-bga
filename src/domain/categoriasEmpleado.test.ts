import {
  CATEGORIAS_POR_DEFECTO,
  capacidadesDelEmpleado,
  categoriaPrincipal,
  categoriasEfectivas,
  coberturaDeTareas,
  etiquetaCategoria,
  hayCiclo,
  insertarEscalon,
  moverEscalon,
  puedeHacer,
  quitarEscalon,
  rumbosDelEmpleado,
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

  it("la lista de siempre: escalones con rumbo, sin ciclos", () => {
    CATEGORIAS_POR_DEFECTO.forEach((x) => expect(hayCiclo(x.id, x.incluye, CATEGORIAS_POR_DEFECTO)).toBe(false));
    // Laqueador (12) → Ayudante especializado de Laqueado (6) → Ayudante general → Aprendiz
    expect(Array.from(categoriasEfectivas([12], CATEGORIAS_POR_DEFECTO)).sort((a, b) => a - b)).toEqual([1, 2, 6, 12]);
    expect(rumbosDelEmpleado([12], CATEGORIAS_POR_DEFECTO)).toEqual(["Laqueado"]);
    expect(etiquetaCategoria(CATEGORIAS_POR_DEFECTO.find((x) => x.id === 6)!, CATEGORIAS_POR_DEFECTO)).toBe("Ayudante especializado · Laqueado");
    expect(etiquetaCategoria(CATEGORIAS_POR_DEFECTO.find((x) => x.id === 12)!, CATEGORIAS_POR_DEFECTO)).toBe("Laqueador");
  });

  it("escalones editables: subir, insertar y quitar (solo vacios) mueven las categorias con ellos", () => {
    const esc = ["Aprendiz", "Ayudante general", "Ayudante de fab.", "Armador"];
    const subido = moverEscalon(esc, cat, 3, 1);
    expect(subido.escalones).toEqual(["Aprendiz", "Ayudante general", "Armador", "Ayudante de fab."]);
    expect(subido.categorias.find((x) => x.id === 4)?.nivel).toBe(4);
    expect(subido.categorias.find((x) => x.id === 9)?.nivel).toBe(3);
    const insertado = insertarEscalon(esc, cat, 2, "Medio oficial");
    expect(insertado.escalones[2]).toBe("Medio oficial");
    expect(insertado.categorias.find((x) => x.id === 9)?.nivel).toBe(5);
    expect(quitarEscalon(esc, cat, 4)).toBeNull(); // Armador tiene categoria
    expect(quitarEscalon(insertado.escalones, insertado.categorias, 3)?.escalones).toEqual(esc);
  });

  it("los responsables no heredan las tareas de abajo (son de control)", () => {
    expect(Array.from(categoriasEfectivas([15], CATEGORIAS_POR_DEFECTO))).toEqual([15]);
    expect(Array.from(categoriasEfectivas([16], CATEGORIAS_POR_DEFECTO))).toEqual([16]);
  });

  it("habilidades extra: no son escalon pero valen como el escalon mas alto", () => {
    const conExtra: CategoriaEmpleado[] = [...cat, { id: 50, nombre: "Terminaciones", nivel: 0, incluye: [], tareaIds: [5000], extra: true }];
    expect(capacidadesDelEmpleado([9, 50], conExtra).find((x) => x.tareaId === 5000)?.prioridad).toBe(4);
    expect(categoriaPrincipal([9, 50], conExtra)?.nombre).toBe("Armador general");
  });
});
