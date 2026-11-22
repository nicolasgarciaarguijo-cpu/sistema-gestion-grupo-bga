import { aplicarPlan, aplicarRecuentos, compararCantidades, leerCantidades, planDeEscritura, recuentosTildados } from "./planillaCantidades";
import type { HojaPlanilla } from "./planillaStock";

// Nicolas, 22/11/2026: la cantidad se corrige de los dos lados; hay quienes no usan el sistema y corrigen la planilla.
const hojas: HojaPlanilla[] = [
  { nombre: "Resumen", filas: [["Planilla de costos"]] },
  { nombre: "Sin cantidad", filas: [["Código", "Descripción", "Costo neto"], ["X-001", "algo", 10]] },
  {
    nombre: "Melaminas",
    filas: [
      ["Código", "Descripción", "Unidad", "Costo neto", "Ubicación", "Cantidad", "Cantidad sistema"],
      ["MEL-001", "Guayubira", "u", 150000, "Rack 1", 12, 12], // nadie la toco
      ["MEL-002", "Carrara", "u", 120000, "Rack 1", 7, 10], // corregida en la planilla
      ["MEL-003", "Nativa", "u", 90000, "Rack 2", 4, 6], // cambiaron los dos lados
      ["MEL-004", "Blanco", "u", 80000, "Rack 2", 20, 20], // cambio el sistema, la planilla no
      ["MEL-005", "Negro", "u", 80000, "Rack 2", "", 3], // no la contaron
      ["MEL-006", "Gris", "u", 80000, "Rack 2", 5, 9], // los dos cambiaron y coinciden
      ["MEL-099", "No existe", "u", 1, "", 2, 2],
      ["MEL-007", "Roble", "u", 1, "", "1.500", "1.500"],
    ],
  },
];
const articulos = [
  { id: 1, code: "MEL-001", description: "Guayubira", unit: "u", quantity: 12 },
  { id: 2, code: "MEL-002", description: "Carrara", unit: "u", quantity: 10 },
  { id: 3, code: "MEL-003", description: "Nativa", unit: "u", quantity: 9 },
  { id: 4, code: "MEL-004", description: "Blanco", unit: "u", quantity: 15 },
  { id: 5, code: "MEL-005", description: "Negro", unit: "u", quantity: 3 },
  { id: 6, code: "MEL-006", description: "Gris", unit: "u", quantity: 5 },
  { id: 7, code: "MEL-007", description: "Roble", unit: "u", quantity: 1500 },
];

describe("cantidades de la planilla", () => {
  it("lee solo las hojas con columna Cantidad", () => {
    const r = leerCantidades(hojas);
    expect(r.hojasLeidas).toEqual(["Melaminas"]);
    expect(r.tieneBase).toBe(true);
    expect(r.filas.find((f) => f.codigo === "MEL-005")!.cantidad).toBe(null);
    expect(r.filas.find((f) => f.codigo === "MEL-007")!.cantidad).toBe(1500);
  });

  it("separa el recuento de la planilla del choque y de lo que cambio el sistema", () => {
    const c = compararCantidades(leerCantidades(hojas).filas, articulos);
    expect(c.recuentos.map((x) => [x.codigo, x.enSistema, x.enPlanilla, x.diferencia])).toEqual([["MEL-002", 10, 7, -3]]);
    expect(c.choques.map((x) => x.codigo)).toEqual(["MEL-003"]);
    expect(c.sinReferencia).toEqual([]);
    expect(c.iguales).toBe(4); // 001, 004 (cambio el sistema), 006 y 007
    expect(c.noAplicables.map((x) => x.codigo)).toEqual(["MEL-099"]);
    expect(recuentosTildados(c)).toEqual([2]);
  });

  it("planilla vieja, sin Cantidad sistema: no se sabe quien cambio y no viene tildado", () => {
    const vieja: HojaPlanilla[] = [{ nombre: "Melaminas", filas: [["Código", "Cantidad"], ["MEL-002", 7], ["MEL-001", 12]] }];
    const c = compararCantidades(leerCantidades(vieja).filas, articulos);
    expect(c.sinReferencia.map((x) => x.codigo)).toEqual(["MEL-002"]);
    expect(c.recuentos).toEqual([]);
    expect(c.iguales).toBe(1);
  });

  it("codigo repetido en el sistema o cantidad negativa: no se aplica", () => {
    const filas = leerCantidades([{ nombre: "A", filas: [["Código", "Cantidad", "Cantidad sistema"], ["ALU-001", 3, 1], ["MEL-001", -2, 12]] }]).filas;
    const c = compararCantidades(filas, [...articulos, { id: 8, code: "ALU-001", quantity: 1 }, { id: 9, code: "alu-001", quantity: 1 }]);
    expect(c.noAplicables.map((x) => x.codigo)).toEqual(["ALU-001", "MEL-001"]);
    expect(c.recuentos).toEqual([]);
  });

  it("aplicar deja la cantidad de la planilla y anota el movimiento", () => {
    let n = 100;
    const r = aplicarRecuentos(articulos, [{ id: 2, enPlanilla: 7 }, { id: 4, enPlanilla: 18 }], "2026-11-22", () => ++n);
    const carrara = r.find((a) => a.id === 2)! as any;
    expect(carrara.quantity).toBe(7);
    expect(carrara.movements[0]).toMatchObject({ type: "salida", quantity: 3, date: "2026-11-22" });
    const blanco = r.find((a) => a.id === 4)! as any;
    expect(blanco.quantity).toBe(18);
    expect(blanco.movements[0]).toMatchObject({ type: "entrada", quantity: 3 });
    expect(r.find((a) => a.id === 1)).toBe(articulos[0]); // lo no elegido no se toca
  });
});

describe("el sistema escribe la planilla", () => {
  const completos = articulos.map((a, i) => ({ ...a, group: "Melaminas", location: i === 0 ? "Rack 1" : "Rack 9", unitPrice: 100, kind: "general", active: true }));

  it("escribe lo que cambio el sistema y no pisa lo que corrigieron en la planilla", () => {
    const plan = planDeEscritura(hojas, completos);
    const de = (codigo: string) => {
      const fila = hojas[2].filas.findIndex((f) => f[0] === codigo);
      return plan.celdas.filter((c) => c.hoja === "Melaminas" && c.fila === fila).map((c) => [c.col, c.valor]);
    };
    expect(de("MEL-001")).toEqual([]); // igual en todo
    expect(de("MEL-004")).toEqual([[4, "Rack 9"], [5, 15], [6, 15]]); // cambio el sistema
    expect(de("MEL-002")).toEqual([[4, "Rack 9"]]); // recuento pendiente: la cantidad no se toca
    expect(de("MEL-003")).toEqual([[4, "Rack 9"]]); // choque pendiente
    expect(de("MEL-005")).toEqual([[4, "Rack 9"], [5, 3]]); // estaba vacia: se completa
    expect(de("MEL-006")).toEqual([[4, "Rack 9"], [6, 5]]); // coinciden: se pone al dia la referencia
    expect(plan.resumen.pendientes).toBe(2);
    expect(plan.resumen.cantidades).toBe(3); // 004, 005 y 006: una por articulo, no por celda
    expect(plan.celdas.some((c) => c.hoja === "Melaminas" && c.col === 3)).toBe(false); // ningun precio
    expect(plan.celdas.some((c) => c.hoja === "Resumen")).toBe(false);
  });

  it("si se elige que vale el sistema, la cantidad de la planilla se pisa", () => {
    const plan = planDeEscritura(hojas, completos, new Set([3]));
    const fila = hojas[2].filas.findIndex((f) => f[0] === "MEL-003");
    expect(plan.celdas.filter((c) => c.fila === fila && c.col >= 5).map((c) => [c.col, c.valor])).toEqual([[5, 9], [6, 9]]);
    expect(plan.resumen.pendientes).toBe(1);
  });

  it("agrega las columnas que faltan y da de alta lo que la planilla no trae", () => {
    const vieja: HojaPlanilla[] = [{ nombre: "Melaminas", filas: [["Planilla"], ["Código", "Descripción", "Unidad", "Costo neto"], ["MEL-001", "Guayubira", "u", 150000], []] }];
    const arts = [
      { ...completos[0] },
      { id: 50, code: "MEL-050", description: "Nueva", unit: "u", quantity: 2, group: "melaminas", location: "Rack 3", unitPrice: 99.5, kind: "general", active: true },
      { id: 51, code: "CHA-001", description: "Chapa kiri", unit: "u", quantity: 1, group: "Chapas", location: "", unitPrice: 10, kind: "general", active: true },
      { id: 52, code: "CHA-002", description: "Discontinuada", unit: "u", quantity: 0, group: "Chapas", active: false, kind: "general" },
      { id: 53, code: "EPP-001", description: "Guantes", unit: "u", quantity: 4, group: "EPP", kind: "epp", active: true },
    ];
    const plan = planDeEscritura(vieja, arts);
    expect(plan.hojasNuevas).toEqual(["Chapas"]);
    expect(plan.resumen.altas).toBe(2);
    const despues = aplicarPlan(vieja, plan);
    const titulos = ["Código", "Descripción", "Unidad", "Costo neto", "Ubicación", "Cantidad", "Cantidad sistema"];
    expect(despues[0].filas[1]).toEqual(titulos);
    expect(despues[0].filas[2]).toEqual(["MEL-001", "Guayubira", "u", 150000, "Rack 1", 12, 12]);
    expect(despues[0].filas[3]).toEqual(["MEL-050", "Nueva", "u", 99.5, "Rack 3", 2, 2]);
    expect(despues[1]).toEqual({ nombre: "Chapas", filas: [titulos, ["CHA-001", "Chapa kiri", "u", 10, "", 1, 1]] });
    // Sincronizada: volver a comparar no encuentra nada y volver a planear no escribe nada.
    const c = compararCantidades(leerCantidades(despues).filas, arts);
    expect([c.recuentos, c.choques, c.sinReferencia]).toEqual([[], [], []]);
    expect(planDeEscritura(despues, arts).celdas).toEqual([]);
  });
});
