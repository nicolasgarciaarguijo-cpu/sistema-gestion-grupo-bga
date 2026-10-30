import { estadoChecklist, renglonesDelTrabajo, rubroDeRenglon } from "./checklistProduccion";

const m = (id: number, description: string, qty: number, stockGroup?: string) => ({ id, description, qty, unit: "u", unitPrice: 1, stockGroup });

describe("checklist antes de producción", () => {
  it("clasifica por el grupo de Stock; los insumos básicos son insumos y los servicios quedan afuera", () => {
    expect(rubroDeRenglon("Melaminas", false)).toBe("materiales");
    expect(rubroDeRenglon("Herrajes", false)).toBe("herrajes");
    expect(rubroDeRenglon("Electricidad", false)).toBe("herrajes");
    expect(rubroDeRenglon("Melaminas", true)).toBe("insumos");
    expect(rubroDeRenglon("Insumos", false)).toBe("insumos");
    expect(rubroDeRenglon("Servicio", false)).toBeNull();
    expect(rubroDeRenglon(undefined, false)).toBe("materiales");
  });

  it("junta lo suelto y lo de cada bloque por su cantidad", () => {
    const r = renglonesDelTrabajo({
      materials: [m(1, "Placa", 2, "Melaminas")],
      basicSupplies: [],
      subBudgets: [{ quantity: 3, materials: [m(2, "Bisagra", 4, "Herrajes")], basicSupplies: [m(3, "Cola", 1)] } as any],
    });
    expect(r.map((x) => [x.description, x.qty, x.rubro])).toEqual([
      ["Placa", 2, "materiales"],
      ["Bisagra", 12, "herrajes"],
      ["Cola", 3, "insumos"],
    ]);
  });

  it("cumple por stock, a mano o porque no lleva; listo solo con los tres", () => {
    const renglones = [{ rubro: "materiales" as const }, { rubro: "herrajes" as const }];
    const faltan = [{ rubro: "herrajes" as const, description: "Bisagra", unit: "u", missing: 5 }];
    const e = estadoChecklist(renglones, faltan, undefined);
    expect(e.rubros.map((x) => x.estado)).toEqual(["stock", "no_lleva", "falta"]);
    expect(e.listo).toBe(false);
    const firmado = estadoChecklist(renglones, faltan, { herrajes: { ok: true, firmante: "Joaquín", firmadoEn: "2026-10-30T12:00:00Z" } });
    expect(firmado.rubros[2]).toMatchObject({ estado: "a_mano", faltantes: [{ description: "Bisagra", missing: 5 }] });
    expect(firmado.listo).toBe(true);
  });

  it("un presupuesto sin ningún material no queda listo: pide el ok a mano", () => {
    const e = estadoChecklist([], [], undefined);
    expect(e.rubros.map((x) => x.estado)).toEqual(["sin_detalle", "sin_detalle", "sin_detalle"]);
    expect(e.listo).toBe(false);
  });
});
