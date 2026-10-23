import {
  RUBROS_POR_DEFECTO,
  cantidadDelRubro,
  cantidadesCotizadas,
  cargaPorDia,
  diasRestantes,
  fechaLimiteCompra,
  nivelDias,
  duracionDelRubro,
  estadoDelPlan,
  finSugerido,
  horasSugeridas,
  sumarHabiles,
} from "./ganttFabricacion";

const job = {
  snapshot: {
    subBudgets: [
      {
        title: "Bajo mesada",
        quantity: 2,
        materials: [
          { description: "Placa Melamina Blanca 18mm", qty: 3, unit: "placa" },
          { description: "Tapacanto melamina blanco", qty: 20, unit: "m" },
          { description: "Corredera telescópica 45cm", qty: 4, unit: "par" },
          { description: "MDF 18mm crudo", qty: 1, unit: "placa" },
        ],
        basicSupplies: [{ description: "Laca poliuretánica", qty: 2.5, unit: "m2" }],
      },
      { title: "Alacena", quantity: 1, materials: [{ description: "Tira LED 12v", qty: 3, unit: "m" }], basicSupplies: [] },
    ],
    materials: [],
    basicSupplies: [],
  },
};

describe("gantt de fabricacion", () => {
  it("saca las cantidades de lo cotizado (bloque x unidades) por palabra clave", () => {
    const c = cantidadesCotizadas(job, RUBROS_POR_DEFECTO);
    expect(c[1].cantidad).toBe(6); // melamina 3 x 2 (el tapacanto no cuenta)
    expect(c[3].cantidad).toBe(2); // MDF
    expect(c[4].cantidad).toBe(3); // modulos: 2 bajo mesada + 1 alacena
    expect(c[5].cantidad).toBe(8); // correderas
    expect(c[7].cantidad).toBe(3); // led
    expect(c[8].cantidad).toBe(5); // laca, sin acento
    expect(c[9].cantidad).toBe(0); // manual
  });

  it("la cantidad a mano le gana a la cotizada", () => {
    expect(cantidadDelRubro({ rubroId: 1, cantidad: 4 }, { cantidad: 6, detalle: [] })).toBe(4);
    expect(cantidadDelRubro({ rubroId: 1 }, { cantidad: 6, detalle: [] })).toBe(6);
  });

  it("horas y dias habiles", () => {
    expect(horasSugeridas(6, 1.5)).toBe(9);
    expect(duracionDelRubro(36, 2)).toBe(2);
    expect(sumarHabiles("2026-10-23", 2)).toBe("2026-10-26"); // viernes + lunes
    expect(sumarHabiles("2026-10-24", 1)).toBe("2026-10-26"); // sabado arranca el lunes
    expect(finSugerido({ rubroId: 1, desde: "2026-10-22", horas: 18, personas: 1 })).toBe("2026-10-23");
  });

  it("espera asignacion mientras falten rubros con fecha, personas y horas", () => {
    const c = cantidadesCotizadas(job, RUBROS_POR_DEFECTO);
    const sinPlan = estadoDelPlan(c, undefined, RUBROS_POR_DEFECTO);
    expect(sinPlan.espera).toBe(true);
    expect(sinPlan.conCantidad).toBe(6);
    const plan = {
      id: 1, company: "BGA", jobId: 1,
      rubros: [1, 3, 4, 5, 7, 8].map((rubroId) => ({ rubroId, desde: "2026-10-26", personas: 1, horas: 4 })),
    };
    expect(estadoDelPlan(c, plan, RUBROS_POR_DEFECTO)).toMatchObject({ espera: false, asignados: 6, horas: 24 });
  });

  it("carga del taller por dia", () => {
    const carga = cargaPorDia([
      { id: 1, company: "BGA", jobId: 1, rubros: [{ rubroId: 1, desde: "2026-10-23", hasta: "2026-10-26", personas: 2 }] },
      { id: 2, company: "BGA", jobId: 2, rubros: [{ rubroId: 2, desde: "2026-10-26", horas: 9, personas: 1 }] },
    ]);
    expect(carga.get("2026-10-23")).toBe(2);
    expect(carga.get("2026-10-24")).toBeUndefined();
    expect(carga.get("2026-10-26")).toBe(3);
  });
});

describe("compras pendientes por trabajo", () => {
  it("la fecha limite es el primer rubro del Gantt sin hacer; si no, el inicio o la fecha maxima", () => {
    const plan = {
      id: 1, company: "BGA", jobId: 1,
      rubros: [
        { rubroId: 1, desde: "2026-10-20", hecho: true },
        { rubroId: 5, desde: "2026-10-28" },
        { rubroId: 2, desde: "2026-10-26" },
      ],
    };
    expect(fechaLimiteCompra({ startDate: "2026-10-30" }, plan, RUBROS_POR_DEFECTO)).toEqual({ fecha: "2026-10-26", origen: "arranca Placas enchapadas (Gantt)" });
    expect(fechaLimiteCompra({ startDate: "2026-10-30" }, undefined, RUBROS_POR_DEFECTO)?.origen).toBe("inicio del trabajo");
    expect(fechaLimiteCompra({ maxRequirementDate: "2026-11-05" }, undefined, RUBROS_POR_DEFECTO)?.fecha).toBe("2026-11-05");
    expect(fechaLimiteCompra({}, undefined, RUBROS_POR_DEFECTO)).toBeNull();
  });

  it("dias restantes y su color", () => {
    expect(diasRestantes("2026-10-26", "2026-10-23")).toBe(3);
    expect(diasRestantes("2026-10-20", "2026-10-23")).toBe(-3);
    expect(nivelDias(3)).toBe("rojo");
    expect(nivelDias(6)).toBe("amarillo");
    expect(nivelDias(15)).toBe("verde");
    expect(nivelDias(null)).toBe("gris");
  });
});
