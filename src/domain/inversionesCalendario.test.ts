import { destinoInversion, entradasInversiones, previsionesDeRescate, renglonDeRescate } from "./inversionesCalendario";

const base = {
  id: 1,
  company: "BGA",
  tipo: "Plazo fijo",
  descripcion: "Patagonia 30 días",
  moneda: "ARS" as const,
  montoInvertido: 1000,
  valorActual: 1050,
  fechaInicio: "2026-09-01",
  fechaFin: "",
  estado: "activa" as const,
};

describe("renglonDeRescate", () => {
  it("por el tipo, o el elegido", () => {
    expect(renglonDeRescate(base)).toBe("rescate_plazo_fijo");
    expect(renglonDeRescate({ tipo: "FCI", descripcion: "Mix VI", renglonRescate: undefined })).toBe("rescate_fci_mix");
    expect(renglonDeRescate({ tipo: "FCI", descripcion: "", renglonRescate: undefined })).toBe("rescate_fci_plus");
    expect(renglonDeRescate({ tipo: "Caución", descripcion: "", renglonRescate: undefined })).toBe("rescate_cauciones");
    expect(renglonDeRescate({ tipo: "Cripto", descripcion: "", renglonRescate: undefined })).toBe("rescate_otra");
    expect(renglonDeRescate({ ...base, renglonRescate: "rescate_otra" })).toBe("rescate_otra");
  });
});

describe("entradasInversiones", () => {
  it("activa: solo la colocación (sale)", () => {
    const r = entradasInversiones([base]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ statusLabel: "debito", conceptKey: "inv_colocacion", amount: 1000 });
  });
  it("cerrada: colocación y rescate; lo que volvió manda sobre la valuación", () => {
    const r = entradasInversiones([{ ...base, estado: "cerrada", fechaFin: "2026-10-01", montoRescatado: 1080, administration: "negro" }]);
    expect(r.map((e) => [e.statusLabel, e.conceptKey, e.amount, e.administration])).toEqual([
      ["debito", "inv_colocacion", 1000, "negro"],
      ["credito", "rescate_plazo_fijo", 1080, "negro"],
    ]);
  });
  it("en dólares queda en dólares", () => {
    expect(entradasInversiones([{ ...base, moneda: "USD" }])[0].currency).toBe("USD");
  });
});

describe("destinoInversion", () => {
  it("reconoce los renglones de la planilla", () => {
    expect(destinoInversion("inv_colocacion")).toBe("colocacion");
    expect(destinoInversion("rescate_cauciones")).toBe("rescate");
    expect(destinoInversion("iv_reintegro_art")).toBeNull();
  });
});

describe("previsionesDeRescate", () => {
  it("la activa con fecha de fin se prevé el día que vence, por su última valuación", () => {
    expect(previsionesDeRescate([{ ...base, fechaFin: "2026-11-02" }])).toEqual([
      expect.objectContaining({ conceptKey: "rescate_plazo_fijo", date: "2026-11-02", amount: 1050, administration: "blanco" }),
    ]);
    expect(previsionesDeRescate([{ ...base, fechaFin: "2026-11-02", valorActual: 0 }])[0].amount).toBe(1000);
  });

  it("sin fecha de fin, cerrada o en dólares no se prevé", () => {
    expect(previsionesDeRescate([base])).toEqual([]);
    expect(previsionesDeRescate([{ ...base, fechaFin: "2026-11-02", estado: "cerrada" }])).toEqual([]);
    expect(previsionesDeRescate([{ ...base, fechaFin: "2026-11-02", moneda: "USD" }])).toEqual([]);
  });
});
