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

describe("capacidad por Tarea entera (28/10/2026)", () => {
  const { capacidadesPorTareaEntera } = require("./categoriasEmpleado");
  it("quien domina un paso de una Tarea domina todos sus pasos", () => {
    const tipos = [{ id: 1, grupoId: 10 }, { id: 2, grupoId: 10 }, { id: 3, grupoId: 11 }];
    const caps = capacidadesPorTareaEntera([{ tareaId: 1, prioridad: 3, categoriaId: 4, heredada: false }], tipos);
    expect(caps.map((c: any) => c.tareaId)).toEqual([1, 2]);
  });
});

describe("tareas que domina y listo para aumento (Nicolas, 31/10/2026)", () => {
  const {
    avanceDeCategoria,
    capacidadesDelEmpleado: caps,
    dominaPaso,
    listoParaAumento,
    marcarTarea,
    puedeHacer,
  } = require("./categoriasEmpleado");
  // Pasos: 10 y 11 son de la Tarea "Corte CNC" (grupo 1); 20 de "Armado" (grupo 2); 30 suelto.
  const tipos = [{ id: 10, grupoId: 1 }, { id: 11, grupoId: 1 }, { id: 20, grupoId: 2 }, { id: 30, grupoId: null }];
  const cats = [
    { id: 1, nombre: "Ayudante", nivel: 2, incluye: [], tareaIds: [10, 11], categoriaGremio: "Ayudante" },
    { id: 2, nombre: "Armador", nivel: 4, incluye: [1], tareaIds: [20, 30], categoriaGremio: "Oficial general" },
    { id: 3, nombre: "Responsable", nivel: 5, incluye: [], tareaIds: [30], categoriaGremio: "Oficial especializado" },
  ];
  const escala: Record<string, number> = { Ayudante: 100, "Medio oficial": 120, "Oficial general": 150, "Oficial especializado": 180 };
  const valor = (c: string) => escala[c] || 0;

  it("dominar un paso es dominar la Tarea entera; marcar una Tarea marca todos sus pasos", () => {
    expect(dominaPaso([11], 10, tipos)).toBe(true);
    expect(dominaPaso([11], 20, tipos)).toBe(false);
    expect(marcarTarea([20], [10, 11], true)).toEqual([20, 10, 11]);
    expect(marcarTarea([20, 10, 11], [10, 11], false)).toEqual([20]);
  });

  it("el avance cuenta las Tareas propias y heredadas", () => {
    expect(avanceDeCategoria(cats[1], cats, [10, 20], tipos)).toEqual({ total: 3, dominadas: 2, completa: false, faltan: [30] });
    expect(avanceDeCategoria(cats[1], cats, [10, 20, 30], tipos).completa).toBe(true);
  });

  it("con tareas dominadas, solo esas valen (aunque tenga la categoría)", () => {
    expect(caps([2], cats).map((c: any) => c.tareaId).sort()).toEqual([10, 11, 20, 30]);
    expect(caps([2], cats, [20]).map((c: any) => c.tareaId)).toEqual([20]);
    expect(puedeHacer([2], 30, cats, [20])).toBe(false);
    // Domina algo de una categoría que no tiene: igual puede hacerlo.
    expect(puedeHacer([1], 20, cats, [20])).toBe(true);
    expect(puedeHacer(undefined, 20, cats, undefined)).toBe(true);
  });

  it("listo para aumento: 100% de una categoría que paga más que la que cobra; si hay varias, la más alta", () => {
    expect(listoParaAumento([10, 20], "Ayudante", cats, tipos, valor)).toBeNull();
    const l = listoParaAumento([10, 20, 30], "Ayudante", cats, tipos, valor);
    expect(l).toMatchObject({ gremio: "Oficial especializado", actual: "Ayudante", valor: 180, valorActual: 100 });
    expect(listoParaAumento([10, 20, 30], "Oficial especializado", cats, tipos, valor)).toBeNull();
  });
});
