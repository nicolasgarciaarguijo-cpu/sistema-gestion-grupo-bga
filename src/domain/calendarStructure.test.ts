import { esCobranzaReal, extraRowsOf, allSectionsWith, sectionKeyFromLabel, esSeccionPropia, CALENDAR_SECTIONS, CALENDAR_ITEM_INDEX } from "./calendarStructure";

describe("esCobranzaReal", () => {
  it("una cobranza sin renglón es cobranza de trabajo", () => {
    expect(esCobranzaReal("cobranza", undefined)).toBe(true);
    expect(esCobranzaReal("cobranza", null)).toBe(true);
  });

  it("lo clasificado en el renglón de cobranzas también", () => {
    expect(esCobranzaReal("banco", "cobranzas")).toBe(true);
  });

  it("un PRÉSTAMO no es cobranza aunque se haya cargado como tal", () => {
    expect(esCobranzaReal("cobranza", "prestamo_nicolas")).toBe(false);
  });

  it("tampoco un rescate de inversión ni un ingreso vario", () => {
    expect(esCobranzaReal("cobranza", "rescate_plazo_fijo")).toBe(false);
    expect(esCobranzaReal("cobranza", "iv_reintegro_art")).toBe(false);
  });

  it("ni un renglón propio del usuario", () => {
    expect(esCobranzaReal("cobranza", "custom:prestamos:Sanchez")).toBe(false);
  });

  it("un pago nunca es cobranza", () => {
    expect(esCobranzaReal("pago", undefined)).toBe(false);
  });
});

describe("estructura de la planilla", () => {
  it("los renglones de PRÉSTAMOS existen y son ingreso", () => {
    const prestamos = CALENDAR_SECTIONS.find((s) => s.key === "prestamos");
    expect(prestamos?.dir).toBe("in");
    expect(CALENDAR_ITEM_INDEX["prestamo_nicolas"]).toEqual({
      sectionKey: "prestamos",
      label: "Préstamo Nicolás",
      dir: "in",
    });
  });
});

describe("extraRowsOf (renglones propios del usuario)", () => {
  const config = {
    labels: {},
    hidden: [],
    extra: [
      { sectionKey: "prestamos", label: "Sanchez" },
      { sectionKey: "prestamos", label: "Alvarez" },
      { sectionKey: "seguros", label: "Seguro galpón" },
      { sectionKey: "prestamos", label: "Sanchez" }, // repetido
      { sectionKey: "prestamos", label: "   " }, // vacío
    ],
  };

  it("devuelve los renglones de esa sección, ordenados y sin repetidos", () => {
    expect(extraRowsOf(config, "prestamos")).toEqual(["Alvarez", "Sanchez"]);
  });

  it("no mezcla secciones", () => {
    expect(extraRowsOf(config, "seguros")).toEqual(["Seguro galpón"]);
  });

  it("una sección sin renglones propios devuelve vacío", () => {
    expect(extraRowsOf(config, "impuestos")).toEqual([]);
  });

  it("tolera una configuración vieja sin el campo extra", () => {
    expect(extraRowsOf({ labels: {}, hidden: [] } as any, "prestamos")).toEqual([]);
    expect(extraRowsOf(undefined, "prestamos")).toEqual([]);
  });
});

describe("secciones propias del usuario", () => {
  const config = {
    labels: {},
    hidden: [],
    extra: [],
    sections: [
      { key: "propia:aportes-socios", label: "Aportes de socios", dir: "in" as const },
      { key: "propia:obra-galpon", label: "Obra galpón", dir: "out" as const },
    ],
  };

  it("las propias de INGRESO van después de los ingresos fijos y antes de los egresos", () => {
    const keys = allSectionsWith(config).map((s) => s.key);
    const iPropiaIn = keys.indexOf("propia:aportes-socios");
    expect(iPropiaIn).toBeGreaterThan(keys.indexOf("ingresos_varios"));
    expect(iPropiaIn).toBeLessThan(keys.indexOf("bancos"));
  });

  it("las propias de EGRESO quedan al final de todo", () => {
    const keys = allSectionsWith(config).map((s) => s.key);
    expect(keys[keys.length - 1]).toBe("propia:obra-galpon");
  });

  it("la sección propia queda armada como una fija (dir, group y total)", () => {
    const s = allSectionsWith(config).find((x) => x.key === "propia:obra-galpon")!;
    expect(s).toMatchObject({ label: "Obra galpón", dir: "out", group: "egreso", totalLabel: "Total Obra galpón", items: [] });
  });

  it("sin secciones propias devuelve la estructura fija tal cual", () => {
    expect(allSectionsWith({ labels: {}, hidden: [], extra: [] }).map((s) => s.key)).toEqual(
      CALENDAR_SECTIONS.map((s) => s.key)
    );
  });

  it("descarta las secciones sin nombre o sin clave", () => {
    const roto = { labels: {}, hidden: [], extra: [], sections: [{ key: "", label: "x", dir: "in" as const }] };
    expect(allSectionsWith(roto).length).toBe(CALENDAR_SECTIONS.length);
  });

  it("la clave sale del nombre, sin acentos ni símbolos", () => {
    expect(sectionKeyFromLabel("Obra galpón 2026!")).toBe("propia:obra-galpon-2026");
    expect(esSeccionPropia(sectionKeyFromLabel("Lo que sea"))).toBe(true);
    expect(esSeccionPropia("prestamos")).toBe(false);
  });
});
