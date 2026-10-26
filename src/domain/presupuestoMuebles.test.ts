import { calcularMueblesDelPresupuesto, materialesDeCadaMueble, planificarMuebles, type MuebleDelPresupuesto, type PersonaParaCotizar } from "./presupuestoMuebles";
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

  describe("quién hace cada tarea", () => {
    // Paso 1: cortar (0,7 h). Paso 2 en paralelo: bisagras (2 h) y armar (4 h).
    const calc = () =>
      calcularMueblesDelPresupuesto([{ id: 1, tipoMuebleId: 1, cantidad: 2, largo: 1, alto: 0.7 }], [alacena], catalogo, [{ description: "Bisagra", qty: 8 }], rubros).muebles;
    const ana: PersonaParaCotizar = { id: 1, nombre: "Ana (oficial)", costoHora: 9000, tareas: [1, 2, 3] };
    const beto: PersonaParaCotizar = { id: 2, nombre: "Beto (ayudante)", costoHora: 5000, tareas: [1, 2, 3] };

    it("la tarea la hace el idóneo más caro; en paralelo, la otra pasa al siguiente para terminar antes", () => {
      const plan = planificarMuebles(calc(), [beto, ana]);
      const quien = (n: string) => plan.asignaciones.find((a) => a.nombre === n)!;
      expect(quien("Cortar placas").persona).toBe("Ana (oficial)");
      expect(quien("Armar módulo")).toMatchObject({ persona: "Ana (oficial)", inicio: 0.7, fin: 4.7 });
      expect(quien("Colocar bisagras")).toMatchObject({ persona: "Beto (ayudante)", inicio: 0.7, fin: 2.7 });
      expect(plan.horasReloj).toBe(4.7);
      expect(plan.costo).toBe(4.7 * 9000 + 2 * 5000);
      expect(plan.porPersona.map((p) => [p.nombre, p.horas])).toEqual([["Ana (oficial)", 4.7], ["Beto (ayudante)", 2]]);
    });

    it("si solo una persona sabe, las tareas en paralelo van una detrás de la otra", () => {
      const plan = planificarMuebles(calc(), [ana, { ...beto, tareas: [1] }]);
      expect(plan.horasReloj).toBe(6.7);
      expect(plan.asignaciones.filter((a) => a.persona === "Ana (oficial)").length).toBe(3);
    });

    it("sin nadie idóneo, se avisa y se cotiza al costo hora más alto", () => {
      const plan = planificarMuebles(calc(), [{ ...ana, tareas: [1, 3] }]);
      expect(plan.sinPersona.map((a) => a.nombre)).toEqual(["Colocar bisagras"]);
      expect(plan.sinPersona[0].costoHora).toBe(9000);
    });

    it("muebles distintos van en paralelo", () => {
      const res = calcularMueblesDelPresupuesto(
        [{ id: 1, tipoMuebleId: 2, cantidad: 1 }, { id: 2, tipoMuebleId: 2, cantidad: 1 }],
        [bajo], catalogo, [{ description: "Bisagra", qty: 16 }], rubros
      );
      const plan = planificarMuebles(res.muebles, [ana, beto]);
      expect(plan.horasReloj).toBe(2);
      expect(plan.porPersona.map((p) => p.nombre)).toEqual(["Ana (oficial)", "Beto (ayudante)"]);
    });

    describe("tareas de 2 o más personas", () => {
      const cat2: TipoTarea[] = [...catalogo, { id: 4, nombre: "Colocar mesada", unidad: "u", horasEstimadas: 1, personas: 2 }];
      const mesada: TipoMueble = { id: 3, nombre: "Mesada", receta: [{ id: 31, tareaId: 4, paso: 1, factor: 1, base: "u" }] };
      const ofA: PersonaParaCotizar = { id: 1, nombre: "Ana", costoHora: 9000, tareas: [4] };
      const ofC: PersonaParaCotizar = { id: 3, nombre: "Carla", costoHora: 8000, tareas: [4] };
      const ayB: PersonaParaCotizar = { id: 2, nombre: "Beto", costoHora: 5000, tareas: [4], ayudante: true };
      const ayD: PersonaParaCotizar = { id: 4, nombre: "Dani", costoHora: 4000, tareas: [], ayudante: true };
      const muebles = (n: number) =>
        calcularMueblesDelPresupuesto(Array.from({ length: n }, (_, i) => ({ id: i + 1, tipoMuebleId: 3, cantidad: 1 })), [mesada], cat2, [], rubros).muebles;

      it("la hace el especialista más caro con el ayudante más caro: mismo tiempo, el doble de horas-hombre", () => {
        const m = muebles(1);
        expect(m[0].horasHombre).toBe(2);
        expect(m[0].horasReloj).toBe(1);
        const plan = planificarMuebles(m, [ayD, ayB, ofC, ofA]);
        expect(plan.asignaciones[0]).toMatchObject({ persona: "Ana", ayudantes: [{ persona: "Beto" }], inicio: 0, fin: 1 });
        expect(plan.costo).toBe(9000 + 5000);
      });

      it("un ayudante no es el especialista aunque sepa la tarea; dos a la vez se reparten la gente", () => {
        const plan = planificarMuebles(muebles(2), [ayD, ayB, ofC, ofA]);
        expect(plan.asignaciones.map((a) => [a.persona, a.ayudantes.map((y) => y.persona)])).toEqual([["Ana", ["Beto"]], ["Carla", ["Dani"]]]);
        expect(plan.horasReloj).toBe(1);
      });

      it("si no alcanza el plantel entero, se avisa y se cotiza igual", () => {
        const plan = planificarMuebles(muebles(1), [ofA]);
        expect(plan.faltanAyudantes.length).toBe(1);
        expect(plan.porPersona.map((p) => [p.nombre, p.costo])).toEqual([["Ana", 9000], ["Personas que faltan", 9000]]);
      });

      it("el aprendiz también es ayudante", () => {
        const apr: PersonaParaCotizar = { id: 9, nombre: "Eli (aprendiz)", costoHora: 3000, tareas: [], ayudante: true, nivel: 1 };
        const plan = planificarMuebles(muebles(1), [ofA, apr]);
        expect(plan.asignaciones[0].ayudantes).toEqual([{ personaId: 9, persona: "Eli (aprendiz)", costoHora: 3000, especialista: false }]);
        expect(plan.especialistasDeAyudante.horas).toBe(0);
      });

      it("si no alcanzan los ayudantes, completa un especialista (el menos caro) y se avisa para contratar", () => {
        const plan = planificarMuebles(muebles(2), [ofA, ofC, ayB, { id: 5, nombre: "Fede", costoHora: 7000, tareas: [] }]);
        // Ana + Beto en una; Carla encabeza la otra y, sin ayudantes libres, la ayuda Fede (especialista).
        expect(plan.asignaciones[1]).toMatchObject({ persona: "Carla", ayudantes: [{ persona: "Fede", especialista: true }] });
        expect(plan.especialistasDeAyudante).toMatchObject({ horas: 1 });
        expect(plan.horasReloj).toBe(1);
      });
    });

    it("el especialista va primero a la tarea más compleja", () => {
      // Paso 2: bisagras (2 h, la sabe un ayudante) y armar (4 h... la sabe solo la oficial). Si las dos arrancan
      // juntas, armar se asigna primero: la oficial queda en lo difícil.
      const of: PersonaParaCotizar = { id: 1, nombre: "Oficial", costoHora: 9000, tareas: [1, 2, 3], nivel: 4 };
      const ay: PersonaParaCotizar = { id: 2, nombre: "Ayudante", costoHora: 5000, tareas: [1, 2], ayudante: true, nivel: 2 };
      const res = calcularMueblesDelPresupuesto(
        [{ id: 1, tipoMuebleId: 1, cantidad: 1, largo: 1, alto: 1 }],
        [{ ...alacena, receta: [{ id: 12, tareaId: 2, paso: 1, factor: 1, base: "rubro:10" }, { id: 13, tareaId: 3, paso: 1, factor: 0.5, base: "u" }] }],
        catalogo, [{ description: "Bisagra", qty: 8 }], rubros
      );
      // bisagras 8 × 0,25 = 2 h (más horas) · armar 0,5 × 2 = 1 h (más compleja)
      const plan = planificarMuebles(res.muebles, [ay, of]);
      expect(plan.asignaciones.map((a) => [a.nombre, a.persona])).toEqual([["Armar módulo", "Oficial"], ["Colocar bisagras", "Ayudante"]]);
    });
  });
});
