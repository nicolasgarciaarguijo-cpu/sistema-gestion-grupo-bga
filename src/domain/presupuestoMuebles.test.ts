import { calcularMueblesDelPresupuesto, materialesDeCadaMueble, repartirHorasEnManoDeObra, type MuebleDelPresupuesto } from "./presupuestoMuebles";
import type { TipoMueble } from "./tiposMueble";
import type { TipoTarea } from "./organizacionDiaria";
import type { RubroFabricacion } from "./ganttFabricacion";

const catalogo: TipoTarea[] = [
  { id: 1, nombre: "Cortar placas", unidad: "m2", horasEstimadas: 0.5 },
  { id: 2, nombre: "Colocar bisagras", unidad: "u", horasEstimadas: 0.25 },
  { id: 3, nombre: "Armar módulo", unidad: "u", horasEstimadas: 2 },
];
const rubros: RubroFabricacion[] = [{ id: 10, nombre: "Bisagras", unidad: "u", origen: "materiales", palabras: ["bisagra"] }];
const alacena: TipoMueble = {
  id: 1,
  nombre: "Alacena",
  receta: [
    { id: 11, tareaId: 1, paso: 1, factor: 1, base: "m2" },
    { id: 12, tareaId: 2, paso: 2, factor: 1, base: "rubro:10" },
    { id: 13, tareaId: 3, paso: 2, factor: 1, base: "u" },
  ],
};
const bajo: TipoMueble = { id: 2, nombre: "Bajo mesada", receta: [{ id: 21, tareaId: 2, paso: 1, factor: 1, base: "rubro:10" }] };

describe("presupuestar por tipo de mueble", () => {
  it("lo cotizado de un rubro se reparte entre los muebles que lo usan, segun cuantos son", () => {
    const muebles: MuebleDelPresupuesto[] = [
      { id: 1, tipoMuebleId: 1, cantidad: 3 },
      { id: 2, tipoMuebleId: 2, cantidad: 1 },
    ];
    const r = materialesDeCadaMueble(muebles, [alacena, bajo], { 10: 16 });
    expect(r.get(1)!.materiales).toEqual({ 10: 12 });
    expect(r.get(2)!.materiales).toEqual({ 10: 4 });
  });

  it("lo fijado a mano manda y se descuenta de lo que se reparte", () => {
    const muebles: MuebleDelPresupuesto[] = [
      { id: 1, tipoMuebleId: 1, cantidad: 3, materiales: { 10: 10 } },
      { id: 2, tipoMuebleId: 2, cantidad: 1 },
    ];
    const r = materialesDeCadaMueble(muebles, [alacena, bajo], { 10: 16 });
    expect(r.get(1)).toEqual({ materiales: { 10: 10 }, aMano: [10] });
    expect(r.get(2)!.materiales).toEqual({ 10: 6 });
  });

  it("horas por mueble con medidas y materiales del bloque; resumen por tarea", () => {
    const res = calcularMueblesDelPresupuesto(
      [{ id: 1, tipoMuebleId: 1, cantidad: 2, largo: 1, alto: 0.7, profundidad: 0.35 }],
      [alacena],
      catalogo,
      [{ description: "Bisagra cazoleta 35mm", qty: 8 }],
      rubros
    );
    const m = res.muebles[0];
    // cortar 1,4 m2 × 0,5 = 0,7 · bisagras 8 × 0,25 = 2 · armar 2 × 2 = 4 (paso 2 en paralelo: reloj = 0,7 + 4)
    expect(m.horasHombre).toBe(6.7);
    expect(m.horasReloj).toBe(4.7);
    expect(m.incompleto).toBe(false);
    expect(res.porTarea.map((t) => [t.nombre, t.horas])).toEqual([["Armar módulo", 4], ["Colocar bisagras", 2], ["Cortar placas", 0.7]]);
  });

  it("sin materiales cotizados del rubro, el mueble queda incompleto; un tipo borrado tambien", () => {
    const res = calcularMueblesDelPresupuesto(
      [
        { id: 1, tipoMuebleId: 1, cantidad: 1, largo: 1, alto: 1 },
        { id: 2, tipoMuebleId: 99, cantidad: 1 },
      ],
      [alacena],
      catalogo,
      [],
      rubros
    );
    expect(res.muebles.map((m) => m.incompleto)).toEqual([true, true]);
    expect(res.incompleto).toBe(true);
  });

  it("las horas se reparten en la mano de obra segun la gente de cada categoria y suman justo", () => {
    const labor = [
      { id: 1, employees: 2, jobHours: 0 },
      { id: 2, employees: 1, jobHours: 0 },
    ];
    const r = repartirHorasEnManoDeObra(labor, 10);
    expect(r.map((l) => l.jobHours)).toEqual([6.67, 3.33]);
    expect(repartirHorasEnManoDeObra([{ id: 1, employees: 0, jobHours: 0 }, { id: 2, employees: 0, jobHours: 5 }], 8).map((l) => l.jobHours)).toEqual([4, 4]);
  });
});
