import { cantidadesPorRubro, medidasDelMueble, recetaOrdenada, resumenDeTiempos, rubrosDeLaReceta, tareasDelMueble, type TipoMueble } from "./tiposMueble";
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
});
