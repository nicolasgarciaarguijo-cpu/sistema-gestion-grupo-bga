import { actualizarGrupo, agregarGrupo, diferenciasConGrupo, gruposDeLaReceta, quitarGrupo, tareasDelGrupo, cantidadesPorRubro, medidasDelMueble, recetaOrdenada, resumenDeTiempos, rubrosDeLaReceta, tareasDelMueble, type TipoMueble } from "./tiposMueble";
import type { TipoTarea } from "./organizacionDiaria";
import type { RubroFabricacion } from "./ganttFabricacion";

const catalogo: TipoTarea[] = [
  { id: 1, nombre: "Cortar placas", unidad: "m2", horasEstimadas: 0.5 },
  { id: 2, nombre: "Cantear", unidad: "ml", horasEstimadas: 0.1 },
  { id: 3, nombre: "Mecanizar", unidad: "u", horasEstimadas: 1 },
  { id: 4, nombre: "Armar módulo", unidad: "u", horasEstimadas: 2 },
  { id: 5, nombre: "Colocar herrajes", unidad: "u" }, // sin tiempo cargado
];

// Bajo mesada: 1 cortar · 2.1 cantear / 2.2 mecanizar (en paralelo) · 3 armar · 4 herrajes
const bajoMesada: TipoMueble = {
  id: 10,
  nombre: "Bajo mesada",
  receta: [
    { id: 101, tareaId: 1, paso: 1, factor: 2.5, base: "m2" },
    { id: 104, tareaId: 4, paso: 3, factor: 1 },
    { id: 102, tareaId: 2, paso: 2, factor: 3, base: "ml" },
    { id: 103, tareaId: 3, paso: 2, factor: 2, base: "u" },
    { id: 105, tareaId: 5, paso: 4, factor: 4, base: "u" },
  ],
};

describe("tipos de mueble", () => {
  it("medidas: unidades, ml, m2 y m3 segun cantidad y tamano", () => {
    expect(medidasDelMueble({ cantidad: 2, largo: 1.5, alto: 0.9, profundidad: 0.6 })).toEqual({ u: 2, ml: 3, m2: 2.7, m3: 1.62 });
  });

  it("los pasos: mismo numero = en paralelo (3.1, 3.2), un solo renglon = numero entero", () => {
    expect(recetaOrdenada(bajoMesada.receta).map((r) => r.etiqueta)).toEqual(["1", "2.1", "2.2", "3", "4"]);
  });

  it("la cantidad sale de las medidas y la correccion a mano le gana", () => {
    const ts = tareasDelMueble(bajoMesada, { tipoMuebleId: 10, cantidad: 1, largo: 2, alto: 0.8, profundidad: 0.6, ajustes: { 103: 5 } }, catalogo);
    const por = (id: number) => ts.find((t) => t.renglonId === id)!;
    expect(por(101)).toMatchObject({ cantidad: 4, horas: 2 }); // 2.5 × 1,6 m2 × 0,5 h
    expect(por(102)).toMatchObject({ cantidad: 6, horas: 0.6 }); // 3 × 2 ml × 0,1 h
    expect(por(103)).toMatchObject({ cantidad: 5, ajustada: true, horas: 5 });
    expect(por(105)).toMatchObject({ cantidad: 4, sinTiempo: true, horas: 0 });
  });

  it("una tarea puede sacar su cantidad de un rubro de materiales del presupuesto", () => {
    const rubros: RubroFabricacion[] = [
      { id: 10, nombre: "Bisagras", unidad: "u", origen: "materiales", palabras: ["bisagra"] },
      { id: 1, nombre: "Placas de melamina", unidad: "placas", origen: "materiales", palabras: ["melamina"], excluir: ["canto"] },
    ];
    const mats = cantidadesPorRubro(
      [
        { description: "Bisagra cazoleta 35mm", qty: 8 },
        { description: "Placa melamina blanca 18mm", qty: 3 },
        { description: "Canto melamina blanco", qty: 20 },
      ],
      rubros
    );
    expect(mats).toEqual({ 10: 8, 1: 3 });
    const tipo: TipoMueble = { id: 1, nombre: "Alacena", receta: [{ id: 1, tareaId: 5, paso: 1, factor: 1, base: "rubro:10" }] };
    expect(rubrosDeLaReceta(tipo)).toEqual([10]);
    const conTiempo = catalogo.map((t) => (t.id === 5 ? { ...t, horasEstimadas: 0.25 } : t));
    expect(tareasDelMueble(tipo, { tipoMuebleId: 1, cantidad: 1, materiales: mats }, conTiempo)[0]).toMatchObject({ cantidad: 8, horas: 2, sinMaterial: false });
    expect(tareasDelMueble(tipo, { tipoMuebleId: 1, cantidad: 1 }, conTiempo)[0]).toMatchObject({ cantidad: 0, sinMaterial: true });
  });

  it("horas-hombre suman todo; horas de reloj toman el renglon mas largo de cada paso", () => {
    const ts = tareasDelMueble(bajoMesada, { tipoMuebleId: 10, cantidad: 1, largo: 2, alto: 0.8, profundidad: 0.6 }, catalogo);
    const r = resumenDeTiempos(ts);
    // paso 1: 2 h · paso 2: 0,6 + 2 (reloj 2) · paso 3: 2 · paso 4: 0
    expect(r.horasHombre).toBe(6.6);
    expect(r.horasReloj).toBe(6);
  });

  describe("grupos de tareas en la receta", () => {
    const cat: TipoTarea[] = [
      { id: 1, nombre: "Cortar", grupoId: 7 },
      { id: 2, nombre: "Cantear", grupoId: 7 },
      { id: 3, nombre: "Armar", grupoId: 8 },
      { id: 4, nombre: "Vieja", grupoId: 7, activa: false },
    ];
    let n = 100;
    const id = () => ++n;

    it("asignar un grupo suma sus tareas activas al final, una por paso, marcadas con el grupo", () => {
      expect(tareasDelGrupo(7, cat)).toEqual([1, 2]);
      const r = agregarGrupo([{ id: 1, tareaId: 3, paso: 1, factor: 1, grupoId: 8 }], 7, tareasDelGrupo(7, cat), id);
      expect(r.slice(1).map((x) => [x.tareaId, x.paso, x.grupoId])).toEqual([[1, 2, 7], [2, 3, 7]]);
      expect(gruposDeLaReceta(r)).toEqual([8, 7]);
      // asignarlo de nuevo no duplica
      expect(agregarGrupo(r, 7, [1, 2], id)).toHaveLength(3);
    });

    it("si el grupo cambia: avisa la diferencia y actualizar suma lo nuevo despues del grupo y saca lo que salió", () => {
      const receta = [
        { id: 1, tareaId: 1, paso: 1, factor: 2, grupoId: 7 },
        { id: 2, tareaId: 2, paso: 2, factor: 1, grupoId: 7 },
        { id: 3, tareaId: 3, paso: 3, factor: 1, grupoId: 8 },
      ];
      // ahora el grupo 7 es: cortar y una tarea nueva 9 (cantear salió)
      expect(diferenciasConGrupo(receta, 7, [1, 9])).toEqual({ faltan: [9], sobran: [receta[1]] });
      const r = actualizarGrupo(receta, 7, [1, 9], id);
      expect(r.find((x) => x.tareaId === 1)).toMatchObject({ paso: 1, factor: 2 }); // conserva lo que tenía
      expect(r.find((x) => x.tareaId === 9)).toMatchObject({ paso: 2, grupoId: 7 }); // justo despues de lo ultimo del grupo
      expect(r.find((x) => x.tareaId === 3)!.paso).toBe(4); // lo que seguía se corre
      expect(r.some((x) => x.tareaId === 2)).toBe(false);
      expect(quitarGrupo(r, 7).map((x) => x.tareaId)).toEqual([3]);
    });
  });
});

describe("ficha del tipo de mueble: tildar las tareas", () => {
  const { tildarGrupo } = require("./tiposMueble");
  const catalogo = [1, 2, 3].map((id) => ({ id, nombre: `P${id}`, activa: true })) as any[];
  const grupos = [{ id: 10, nombre: "Corte CNC", tareaIds: [1, 2, 3] }];
  let n = 100;
  const nuevoId = () => ++n;

  it("tildar la tarea suma todo su paso a paso; destildarla lo saca", () => {
    let t = tildarGrupo({ id: 1, nombre: "Bajo mesada", receta: [] }, 10, true, catalogo, grupos, nuevoId);
    expect(t.receta.map((r: any) => r.tareaId)).toEqual([1, 2, 3]);
    t = tildarGrupo(t, 10, false, catalogo, grupos, nuevoId);
    expect(t.receta).toEqual([]);
  });
});

describe("materiales de los tipos de mueble", () => {
  const { materialesDeLosMuebles, cantidadConDesperdicio } = require("./tiposMueble");
  const stock = [
    { id: 1, description: "Placa melamina blanca 18mm", unit: "m2", unitPrice: 10000 },
    { id: 2, description: "Bisagra cazoleta", unit: "u", unitPrice: 500 },
  ];
  const tipos = [
    { id: 7, nombre: "Bajo mesada melamina 60x72x56", receta: [], desperdicioPct: 10, materiales: [
      { id: 1, stockItemId: 1, cantidad: 2 },
      { id: 2, stockItemId: 2, cantidad: 2, desperdicioPct: 0 },
    ] },
  ];
  it("la cantidad lleva el % de desperdicio del tipo, o el propio del material", () => {
    expect(cantidadConDesperdicio(tipos[0], tipos[0].materiales[0])).toBeCloseTo(2.2);
    expect(cantidadConDesperdicio(tipos[0], tipos[0].materiales[1])).toBe(2);
  });
  it("suma por item de Stock según la cantidad de muebles, con el precio de Stock", () => {
    const r = materialesDeLosMuebles([{ tipoMuebleId: 7, cantidad: 3 }], tipos, stock);
    expect(r.map((x: any) => [x.description, x.qty, x.unitPrice])).toEqual([
      ["Placa melamina blanca 18mm", 7, 10000], // sin regla de compra: para arriba
      ["Bisagra cazoleta", 6, 500],
    ]);
  });

  it("genéricos (30/10/2026): suma por rubro y tipo entre muebles y el artículo se elige al presupuestar", () => {
    const { genericosDeLosMuebles } = require("./tiposMueble");
    const stockG = [
      { id: 1, description: "Melamina blanca 18mm", unit: "m2", unitPrice: 10000, group: "Melaminas" },
      { id: 3, description: "Melamina símil roble 18mm", unit: "m2", unitPrice: 14000, group: "Melaminas" },
      { id: 4, description: "Corredera telescópica 45cm", unit: "u", unitPrice: 3000, group: "Herrajes" },
    ];
    const tiposG = [
      { id: 1, nombre: "Bajo 60", receta: [], desperdicioPct: 0, materiales: [
        { id: 1, nombre: "Placa", unidad: "m2", grupo: "Melaminas", cantidad: 4.2, stockItemId: 1 },
        { id: 2, nombre: "Corredera", unidad: "u", grupo: "Herrajes", cantidad: 2 },
      ] },
      { id: 2, nombre: "Alacena 60", receta: [], desperdicioPct: 0, materiales: [{ id: 3, nombre: "placa ", unidad: "m2", grupo: "Melaminas", cantidad: 2 }] },
    ];
    const muebles = [{ tipoMuebleId: 1, cantidad: 2 }, { tipoMuebleId: 2, cantidad: 1 }];
    const g = genericosDeLosMuebles(muebles, tiposG, stockG);
    expect(g.map((x: any) => [x.nombre, x.qty, x.sugeridoId])).toEqual([["Placa", 10.4, 1], ["Corredera", 4, undefined]]);
    // Sin elegir: va el sugerido; la corredera sin sugerido pasa con precio 0 para elegirla.
    const sinElegir = materialesDeLosMuebles(muebles, tiposG, stockG);
    expect(sinElegir.map((x: any) => [x.description, x.qty, x.unitPrice])).toEqual([
      ["Melamina blanca 18mm", 10.4, 10000],
      ["⚠ Corredera: SIN ARTÍCULO · FALTA PRECIO", 4, 0],
    ]);
    const elegidos = { [g[0].clave]: 3, [g[1].clave]: 4 };
    expect(materialesDeLosMuebles(muebles, tiposG, stockG, { elegidos }).map((x: any) => [x.description, x.unitPrice, x.generico])).toEqual([
      ["Melamina símil roble 18mm", 14000, "melaminas|placa"],
      ["Corredera telescópica 45cm", 3000, "herrajes|corredera"],
    ]);
  });

  it("convertidor (30/10/2026): pasa a la unidad del artículo, redondea según cómo se compra y suma el catalizador", () => {
    const { CONVERTIDOR_POR_DEFECTO, equivalenciaPara, cantidadAComprar } = require("./tiposMueble");
    const stockC = [
      { id: 1, description: "Melamina blanca 18mm 2.75x1.84", unit: "u", unitPrice: 50000, group: "Melaminas" },
      { id: 2, description: "Laca poliuretanica COLOR", unit: "lt", unitPrice: 20000, group: "Pinturas" },
      { id: 3, description: "Fondo poliuretanico COLOR", unit: "u", unitPrice: 0, group: "Pinturas" },
      { id: 4, description: "Melamina s/mdf 18mm Roble", unit: "u", unitPrice: 70000, group: "Melaminas" },
    ];
    const tipoC = [{ id: 1, nombre: "Frente laqueado", receta: [], desperdicioPct: 0, materiales: [
      { id: 1, nombre: "Placa", unidad: "m2", grupo: "Melaminas", cantidad: 10, stockItemId: 1 },
      { id: 2, nombre: "Laca", unidad: "m2", grupo: "Pinturas", cantidad: 7, stockItemId: 2 },
      { id: 3, nombre: "Fondo", unidad: "m2", grupo: "Pinturas", cantidad: 7, stockItemId: 3 },
    ] }];
    const r = materialesDeLosMuebles([{ tipoMuebleId: 1, cantidad: 1 }], tipoC, stockC);
    expect(r.map((x: any) => [x.nombre, x.uso, x.qty, x.unit, !!x.sinPrecio])).toEqual([
      ["Placa", 2.222, 2.222, "u", false], // placa blanca = compra intensiva: exacto (10 m² / 4,5)
      ["Laca", 2.1, 3, "lt", false], // laca de color: mínimo 3 L
      ["Fondo", 1.4, 2, "u", true], // sin regla: para arriba; sin precio en Stock: marcado
      ["Catalizador", 1.05, 2, "lata de 1 L", true], // la mitad del USO de laca, sin artículo elegido
    ]);
    expect(r[3].acompanaA).toBe("Laca");
    expect(r[0].equivalencia).toBe("1 placa = 4,5 m2");
    // Placa de color: no es intensiva, se redondea a placas enteras.
    const roble = materialesDeLosMuebles([{ tipoMuebleId: 1, cantidad: 1 }], tipoC, stockC, { elegidos: { "melaminas|placa": 4 } })[0];
    expect([roble.uso, roble.qty]).toEqual([2.222, 3]);
    // Laca de color pasados los 3 L: de a 1 litro, no de a 3.
    expect([cantidadAComprar(2, { id: 1, minimo: 3 }), cantidadAComprar(3.2, { id: 1, minimo: 3 }), cantidadAComprar(5, { id: 1, minimo: 3 })]).toEqual([3, 4, 5]);
    // Corrección a mano: manda, pero se ve lo que da el tipo.
    const a = materialesDeLosMuebles([{ tipoMuebleId: 1, cantidad: 1 }], tipoC, stockC, { cantidades: { "melaminas|placa": 3 } })[0];
    expect([a.qty, a.qtyDelTipo, a.cantidadManual]).toEqual([3, 2.222, true]);
    // La más puntual gana: la del artículo antes que la del material.
    const propia = { id: 9, articuloId: 1, unidadMaterial: "m2", unidadArticulo: "placa", modo: "contiene", valor: 5 };
    expect(equivalenciaPara({ nombre: "Placa", unidad: "m2" }, stockC[0], [...CONVERTIDOR_POR_DEFECTO.equivalencias, propia]).valor).toBe(5);
    // Sin equivalencia y unidad distinta: pasa tal cual y avisa.
    const sinEq = materialesDeLosMuebles([{ tipoMuebleId: 1, cantidad: 1 }], tipoC, stockC, { convertidor: { equivalencias: [] } })[0];
    expect([sinEq.qty, sinEq.sinEquivalencia]).toEqual([10, "m2 → u"]);
  });

  it("los materiales viejos (solo artículo) valen como genérico con el nombre, unidad y grupo de su artículo", () => {
    const { genericoDe } = require("./tiposMueble");
    expect(genericoDe({ id: 1, stockItemId: 2, cantidad: 1 }, [{ id: 2, description: "Bisagra cazoleta", unit: "u", unitPrice: 500, group: "Herrajes" }])).toEqual({
      nombre: "Bisagra cazoleta",
      unidad: "u",
      grupo: "Herrajes",
      sugeridoId: 2,
    });
  });
});

describe("personas del tipo de mueble y falta de gente (28/10/2026)", () => {
  const { necesidadPorTarea, faltaDeGente, claveTarea } = require("./tiposMueble");
  const catalogo: TipoTarea[] = [
    { id: 1, nombre: "Armado de módulos", grupoId: 10, horasEstimadas: 5 },
    { id: 2, nombre: "Montaje de módulos", grupoId: 11 },
  ];
  const tipo: TipoMueble = {
    id: 7,
    nombre: "Bajo mesada 1,80",
    personas: 2,
    receta: [
      { id: 1, tareaId: 1, paso: 1, factor: 1, horas: 3 },
      { id: 2, tareaId: 2, paso: 2, factor: 1 },
    ],
  };

  it("las horas cargadas en el tipo le ganan al catalogo y la cuadrilla vale para todas sus tareas", () => {
    const calc = tareasDelMueble(tipo, { tipoMuebleId: 7, cantidad: 2 }, catalogo);
    expect(calc[0]).toEqual(expect.objectContaining({ horas: 6, personas: 2, horasHombre: 12, sinTiempo: false }));
    expect(calc[1]).toEqual(expect.objectContaining({ personas: 2, sinTiempo: true }));
  });

  it("suma lo que piden los muebles del trabajo por tarea y avisa cuando hay menos gente", () => {
    const n = necesidadPorTarea([{ tipoMuebleId: 7, cantidad: 2 }], [tipo], catalogo, [{ id: 10, nombre: "Armado" }]);
    const armado = n.get(claveTarea(1, catalogo));
    expect(armado).toEqual({ nombre: "Armado", personas: 2, horas: 6, horasHombre: 12 });
    expect(faltaDeGente(armado, 1)).toEqual({ faltan: 1, horasConLaQueHay: 12 });
    expect(faltaDeGente(armado, 2)).toBeNull();
  });
});
