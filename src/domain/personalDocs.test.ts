import {
  addMonthsIso,
  parsePersonalFileName,
  resolvePersonalDoc,
  type ProvisionCatalogItem,
} from "./personalDocs";

const catalog: ProvisionCatalogItem[] = [
  { code: "EPP-002", description: "Zapatos de seguridad", kind: "EPP", periodicityMonths: 6 },
  { code: "INS-001", description: "Guantes", kind: "Insumos", periodicityMonths: 6 },
];

describe("addMonthsIso", () => {
  it("suma meses cruzando de anio", () => {
    expect(addMonthsIso("2026-06-15", 6)).toBe("2026-12-15");
    expect(addMonthsIso("2026-10-01", 12)).toBe("2027-10-01");
  });
});

describe("parsePersonalFileName", () => {
  it("separa fecha e item", () => {
    expect(parsePersonalFileName("2026-06-15 Zapatos de seguridad.pdf")).toEqual({
      date: "2026-06-15",
      itemName: "Zapatos de seguridad",
    });
  });
  it("sin fecha = date vacio", () => {
    expect(parsePersonalFileName("ART.pdf").date).toBe("");
  });
});

describe("resolvePersonalDoc", () => {
  it("EPP: matchea catalogo y calcula vigencia = fecha + periodicidad", () => {
    const r = resolvePersonalDoc("2026-06-15 Zapatos de seguridad.pdf", "EPP", catalog);
    expect(r).toMatchObject({
      target: "provision",
      kind: "EPP",
      stockCode: "EPP-002",
      dueDate: "2026-12-15",
      deliveryDate: "2026-06-15",
    });
  });

  it("Documentacion: la fecha del nombre es el vencimiento", () => {
    const r = resolvePersonalDoc("2027-03-01 ART.pdf", "Documentacion", catalog);
    expect(r).toMatchObject({ target: "document", itemName: "ART", dueDate: "2027-03-01" });
  });

  it("Examenes sin catalogo: periodicidad default 12 meses", () => {
    const r = resolvePersonalDoc("2026-05-10 Examen periodico.pdf", "Examenes", catalog);
    expect(r?.target).toBe("provision");
    expect(r?.kind).toBe("Examenes");
    expect(r?.dueDate).toBe("2027-05-10");
  });

  it("Recibos: no genera vigencia (solo se archiva)", () => {
    expect(resolvePersonalDoc("2026-06-15 Recibo.pdf", "Recibos", catalog)).toBeNull();
  });

  it("Sin fecha en el nombre: no genera vigencia", () => {
    expect(resolvePersonalDoc("Zapatos.pdf", "EPP", catalog)).toBeNull();
  });
});
